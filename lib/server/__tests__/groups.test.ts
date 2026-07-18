import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProject } from "@/lib/server/papers";
import {
  createGroup,
  joinGroupByInviteCode,
  listGroups,
} from "@/lib/server/groups";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";
import type { ProjectRecord } from "@/lib/types/papertree";

vi.mock("@/lib/server/papers", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-client", () => ({
  getSupabaseAdmin: vi.fn(),
}));

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

interface QueryChain extends PromiseLike<QueryResult> {
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
}

function createQuery(result: QueryResult): QueryChain {
  const query = {} as QueryChain;
  query.delete = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.insert = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.single = vi.fn(async () => result);
  query.upsert = vi.fn(() => query);
  query.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
}

function useQueries(...queries: QueryChain[]) {
  const queue = [...queries];
  const from = vi.fn(() => {
    const query = queue.shift();
    if (!query) {
      throw new Error("Unexpected Supabase query.");
    }
    return query;
  });

  vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  return from;
}

const groupRow = {
  id: "group-1",
  name: "Quantum Devices Lab",
  owner_id: "owner-1",
  description: null,
  invite_code: "invite-1234",
  created_at: "2026-07-18T12:00:00.000Z",
  updated_at: "2026-07-18T12:00:00.000Z",
};

const groupProject: ProjectRecord = {
  id: "project-1",
  name: "Quantum Devices Lab Reading List",
  user_id: "owner-1",
  group_id: "group-1",
  created_at: "2026-07-18T12:00:00.000Z",
  updated_at: "2026-07-18T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listGroups", () => {
  it("returns each membership role and the current member count", async () => {
    useQueries(
      createQuery({
        data: [
          { group_id: "group-1", role: "owner" },
          { group_id: "group-2", role: "member" },
        ],
        error: null,
      }),
      createQuery({
        data: [
          groupRow,
          {
            ...groupRow,
            id: "group-2",
            name: "Photonics Reading Club",
            owner_id: "owner-2",
            invite_code: "invite-5678",
          },
        ],
        error: null,
      }),
      createQuery({
        data: [
          { group_id: "group-1" },
          { group_id: "group-1" },
          { group_id: "group-2" },
        ],
        error: null,
      }),
    );

    await expect(listGroups("owner-1")).resolves.toMatchObject([
      { id: "group-1", role: "owner", member_count: 2 },
      { id: "group-2", role: "member", member_count: 1 },
    ]);
  });
});

describe("createGroup", () => {
  it("creates the owner membership and shared reading-list project", async () => {
    const groupInsert = createQuery({ data: groupRow, error: null });
    const memberInsert = createQuery({ error: null });
    const from = useQueries(groupInsert, memberInsert);
    vi.mocked(createProject).mockResolvedValue(groupProject);

    await expect(createGroup("owner-1", "  Quantum Devices Lab  ")).resolves.toEqual({
      group: expect.objectContaining({
        id: "group-1",
        name: "Quantum Devices Lab",
        role: "owner",
        member_count: 1,
      }),
      project: groupProject,
    });

    expect(groupInsert.insert).toHaveBeenCalledWith({
      owner_id: "owner-1",
      name: "Quantum Devices Lab",
    });
    expect(memberInsert.insert).toHaveBeenCalledWith({
      group_id: "group-1",
      user_id: "owner-1",
      role: "owner",
    });
    expect(createProject).toHaveBeenCalledWith(
      "owner-1",
      "Quantum Devices Lab Reading List",
      "group-1",
    );
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("removes the new group when its default project cannot be created", async () => {
    const rollback = createQuery({ error: null });
    useQueries(
      createQuery({ data: groupRow, error: null }),
      createQuery({ error: null }),
      rollback,
    );
    vi.mocked(createProject).mockRejectedValue(new Error("project insert failed"));

    await expect(createGroup("owner-1", "Quantum Devices Lab")).rejects.toThrow(
      "project insert failed",
    );
    expect(rollback.delete).toHaveBeenCalledOnce();
    expect(rollback.eq).toHaveBeenCalledWith("id", "group-1");
  });
});

describe("joinGroupByInviteCode", () => {
  it("joins a member idempotently and returns the updated count", async () => {
    const membershipUpsert = createQuery({ error: null });
    useQueries(
      createQuery({ data: groupRow, error: null }),
      membershipUpsert,
      createQuery({
        data: [{ group_id: "group-1" }, { group_id: "group-1" }],
        error: null,
      }),
    );

    await expect(joinGroupByInviteCode("student-1", " invite-1234 ")).resolves.toMatchObject({
      id: "group-1",
      role: "member",
      member_count: 2,
    });
    expect(membershipUpsert.upsert).toHaveBeenCalledWith(
      {
        group_id: "group-1",
        user_id: "student-1",
        role: "member",
      },
      {
        onConflict: "group_id,user_id",
        ignoreDuplicates: true,
      },
    );
  });
});
