import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

if (process.env.PAPERTREE_LIVE_TEST !== "1") {
  throw new Error("Set PAPERTREE_LIVE_TEST=1 to run the destructive live smoke test.");
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.PAPERTREE_APP_URL ?? "http://127.0.0.1:3001";

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error("Supabase environment variables are missing.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `PaperTree-${randomBytes(12).toString("base64url")}!`;
const ownerEmail = `papertree-live-owner-${runId}@example.com`;
const memberEmail = `papertree-live-member-${runId}@example.com`;
const userIds = [];
let groupId;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createTestUser(email, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, source: "papertree-live-smoke" },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? `Failed to create ${role} user.`);
  }

  userIds.push(data.user.id);
  return data.user;
}

async function createSession(email) {
  const cookieJar = new Map();
  const client = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return [...cookieJar].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const { name, value } of cookies) {
          cookieJar.set(name, value);
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function api(path, cookie, init = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { body, response };
}

async function signInDataClient(email) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return client;
}

async function run() {
  const unauthenticated = await api("/api/groups", null, {
    method: "POST",
    body: JSON.stringify({ name: "Should not be created" }),
  });
  assert(
    unauthenticated.response.status === 401,
    `Unauthenticated create returned ${unauthenticated.response.status}.`,
  );

  const owner = await createTestUser(ownerEmail, "owner");
  const member = await createTestUser(memberEmail, "member");
  const [ownerCookie, memberCookie] = await Promise.all([
    createSession(ownerEmail),
    createSession(memberEmail),
  ]);

  const created = await api("/api/groups", ownerCookie, {
    method: "POST",
    body: JSON.stringify({ name: `Live Research Group ${runId}` }),
  });
  assert(created.response.status === 201, `Group create returned ${created.response.status}.`);
  assert(created.body?.group?.role === "owner", "Creator did not receive the owner role.");
  assert(created.body?.project?.group_id === created.body?.group?.id, "Group project was not linked.");

  groupId = created.body.group.id;
  const projectId = created.body.project.id;
  const inviteCode = created.body.group.invite_code;

  const joined = await api("/api/groups/join", memberCookie, {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
  assert(joined.response.status === 200, `Group join returned ${joined.response.status}.`);
  assert(joined.body?.group?.role === "member", "Invitee did not receive the member role.");
  assert(joined.body?.group?.member_count === 2, "Group member count is not two.");

  const [ownerGroups, memberGroups, memberProjects, memberGraph] = await Promise.all([
    api("/api/groups", ownerCookie),
    api("/api/groups", memberCookie),
    api("/api/projects", memberCookie),
    api(`/api/papers?projectId=${encodeURIComponent(projectId)}`, memberCookie),
  ]);

  assert(ownerGroups.response.ok, "Owner could not list groups.");
  assert(memberGroups.response.ok, "Member could not list groups.");
  assert(
    memberProjects.body?.projects?.some((project) => project.id === projectId),
    "Member could not see the shared project.",
  );
  assert(memberGraph.response.ok, "Member could not open the shared paper graph.");

  const { data: node, error: nodeError } = await admin
    .from("nodes")
    .insert({
      title: `Live paper ${runId}`,
      type: "article",
      metadata: {},
      status: "unread",
      user_id: owner.id,
      project_id: projectId,
    })
    .select("id")
    .single();
  if (nodeError || !node) {
    throw new Error(nodeError?.message ?? "Failed to create the live paper node.");
  }

  const [memberClient, ownerClient] = await Promise.all([
    signInDataClient(memberEmail),
    signInDataClient(ownerEmail),
  ]);
  const { error: commentError } = await memberClient.from("paper_comments").insert({
    project_id: projectId,
    node_id: node.id,
    author_id: member.id,
    body: "Live group review comment",
    page_number: 1,
  });
  if (commentError) {
    throw new Error(`Member comment failed: ${commentError.message}`);
  }

  const { error: progressError } = await memberClient.from("paper_read_progress").upsert({
    project_id: projectId,
    node_id: node.id,
    user_id: member.id,
    current_page: 2,
    total_pages: 8,
    active_seconds: 120,
    last_active_at: new Date().toISOString(),
  });
  if (progressError) {
    throw new Error(`Member progress failed: ${progressError.message}`);
  }

  const { error: sessionError } = await memberClient.from("paper_read_sessions").insert({
    project_id: projectId,
    node_id: node.id,
    user_id: member.id,
    active_seconds: 120,
    started_at: new Date(Date.now() - 120_000).toISOString(),
  });
  if (sessionError) {
    throw new Error(`Member read session failed: ${sessionError.message}`);
  }

  const { data: ownerProgress, error: ownerProgressError } = await ownerClient
    .from("paper_read_progress")
    .select("user_id,current_page,total_pages,active_seconds")
    .eq("project_id", projectId)
    .eq("user_id", member.id)
    .single();
  if (ownerProgressError) {
    throw new Error(`Owner progress read failed: ${ownerProgressError.message}`);
  }
  assert(ownerProgress.active_seconds === 120, "Owner saw an incorrect reading duration.");

  return {
    apiAuthentication: "passed",
    groupCreateAndJoin: "passed",
    sharedProjectAccess: "passed",
    commentsRls: "passed",
    readingProgressRls: "passed",
    ownerProgressVisibility: "passed",
  };
}

try {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
} finally {
  for (const userId of [...userIds].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`Cleanup warning for user ${userId}: ${error.message}`);
    }
  }

  if (groupId) {
    const { data } = await admin.from("groups").select("id").eq("id", groupId).maybeSingle();
    assert(!data, "Live test group remained after cleanup.");
  }
}
