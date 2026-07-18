"use client";

import { Copy, Link2, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { GroupRecord, ProjectRecord } from "@/lib/types/papertree";

interface GroupPanelProps {
  currentProjectId: string | null;
  groups: GroupRecord[];
  isGuest?: boolean;
  onCreateGroup: (name: string) => Promise<void>;
  onJoinGroup: (inviteCode: string) => Promise<void>;
  projects: ProjectRecord[];
}

export function GroupPanel({
  currentProjectId,
  groups,
  isGuest = false,
  onCreateGroup,
  onJoinGroup,
  projects,
}: GroupPanelProps) {
  const currentProject = projects.find((project) => project.id === currentProjectId) ?? null;
  const activeGroup =
    groups.find((group) => group.id === currentProject?.group_id) ?? groups[0] ?? null;

  async function handleCreateGroup() {
    const name = window.prompt("Group name");
    if (!name) {
      return;
    }

    await onCreateGroup(name);
  }

  async function handleJoinGroup() {
    const inviteCode = window.prompt("Paste group invite code");
    if (!inviteCode) {
      return;
    }

    await onJoinGroup(inviteCode);
  }

  async function handleCopyInvite() {
    if (!activeGroup) {
      return;
    }

    const inviteUrl = new URL("/join", window.location.origin);
    inviteUrl.searchParams.set("code", activeGroup.invite_code);
    await navigator.clipboard.writeText(inviteUrl.toString());
    toast.success("Invite link copied.");
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UsersRound className="h-3.5 w-3.5 text-blue-500" />
          <p className="text-[11px] font-medium text-slate-500">Group</p>
        </div>
        <div className="flex items-center">
          {activeGroup ? (
            <span className="mr-1 text-[10px] uppercase text-slate-400">{activeGroup.role}</span>
          ) : null}
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={isGuest}
            onClick={handleCreateGroup}
            aria-label="Create group"
            title="Create group"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={isGuest}
            onClick={handleJoinGroup}
            aria-label="Join group"
            title="Join group"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {activeGroup ? (
        <div className="space-y-2">
          <div>
            <p className="truncate text-sm font-medium text-slate-800">{activeGroup.name}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {activeGroup.member_count} member{activeGroup.member_count === 1 ? "" : "s"} sharing papers
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-[11px] text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
            onClick={handleCopyInvite}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <span className="truncate font-mono">{activeGroup.invite_code}</span>
            </span>
            <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        </div>
      ) : (
        <p className="text-xs leading-5 text-slate-500">
          Create a group for lab reading lists, or join with an invite code.
        </p>
      )}
    </section>
  );
}
