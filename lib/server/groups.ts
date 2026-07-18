import { createProject } from "@/lib/server/papers";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";
import type { GroupMemberRole, GroupRecord, ProjectRecord } from "@/lib/types/papertree";

const GROUP_COLUMNS = [
  "id",
  "name",
  "owner_id",
  "description",
  "invite_code",
  "created_at",
  "updated_at",
].join(", ");

interface GroupRow {
  id: string;
  name: string;
  owner_id: string;
  description?: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

function normalizeGroup(
  group: Record<string, unknown>,
  role: GroupMemberRole,
  memberCount: number,
): GroupRecord {
  return {
    id: String(group.id),
    name: String(group.name),
    owner_id: String(group.owner_id),
    description: (group.description as string | null | undefined) || null,
    invite_code: String(group.invite_code),
    role,
    member_count: memberCount,
    created_at: String(group.created_at),
    updated_at: String(group.updated_at),
  };
}

async function memberCountsByGroup(groupIds: string[]) {
  if (groupIds.length === 0) {
    return new Map<string, number>();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const groupId = String(row.group_id);
    counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
  }

  return counts;
}

export async function listGroups(userId: string): Promise<GroupRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data: membershipData, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const roleByGroup = new Map<string, GroupMemberRole>();
  for (const membership of membershipData || []) {
    roleByGroup.set(String(membership.group_id), membership.role as GroupMemberRole);
  }

  const groupIds = [...roleByGroup.keys()];
  if (groupIds.length === 0) {
    return [];
  }

  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select(GROUP_COLUMNS)
    .in("id", groupIds)
    .order("created_at", { ascending: true });

  if (groupError) {
    throw new Error(groupError.message);
  }

  const counts = await memberCountsByGroup(groupIds);

  return ((groupData || []) as unknown as Array<Record<string, unknown>>).map((group) => {
    const groupId = String(group.id);
    return normalizeGroup(
      group,
      roleByGroup.get(groupId) ?? "member",
      counts.get(groupId) ?? 1,
    );
  });
}

export async function createGroup(
  userId: string,
  name: string,
): Promise<{ group: GroupRecord; project: ProjectRecord }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Group name is required.");
  }

  const supabase = getSupabaseAdmin();
  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .insert({
      owner_id: userId,
      name: trimmedName,
    })
    .select(GROUP_COLUMNS)
    .single();

  if (groupError || !groupData) {
    throw new Error(groupError?.message || "Failed to create group.");
  }

  const group = groupData as unknown as GroupRow;
  async function rollbackGroup() {
    await supabase.from("groups").delete().eq("id", group.id);
  }

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    await rollbackGroup();
    throw new Error(memberError.message);
  }

  let project: ProjectRecord;
  try {
    project = await createProject(userId, `${trimmedName} Reading List`, group.id);
  } catch (error) {
    await rollbackGroup();
    throw error;
  }

  return {
    group: normalizeGroup(groupData as unknown as Record<string, unknown>, "owner", 1),
    project,
  };
}

export async function joinGroupByInviteCode(userId: string, inviteCode: string): Promise<GroupRecord> {
  const normalizedInviteCode = inviteCode.trim();
  if (!normalizedInviteCode) {
    throw new Error("Invite code is required.");
  }

  const supabase = getSupabaseAdmin();
  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select(GROUP_COLUMNS)
    .eq("invite_code", normalizedInviteCode)
    .single();

  if (groupError || !groupData) {
    throw new Error(groupError?.message || "Invite code was not found.");
  }

  const group = groupData as unknown as GroupRow;
  const { error: memberError } = await supabase.from("group_members").upsert(
    {
      group_id: group.id,
      user_id: userId,
      role: group.owner_id === userId ? "owner" : "member",
    },
    {
      onConflict: "group_id,user_id",
      ignoreDuplicates: true,
    },
  );

  if (memberError) {
    throw new Error(memberError.message);
  }

  const counts = await memberCountsByGroup([group.id]);

  return normalizeGroup(
    groupData as unknown as Record<string, unknown>,
    group.owner_id === userId ? "owner" : "member",
    counts.get(group.id) ?? 1,
  );
}
