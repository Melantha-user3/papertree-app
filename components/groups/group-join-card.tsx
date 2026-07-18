"use client";

import { ArrowRight, Check, LogIn, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperTreeMark } from "@/components/brand/papertree-mark";

interface GroupJoinCardProps {
  code: string;
  userEmail: string | null;
}

export function GroupJoinCard({ code, userEmail }: GroupJoinCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const nextPath = `/join?code=${encodeURIComponent(code)}`;

  async function handleJoin() {
    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/groups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode: code }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to join this group.");
      }

      setIsJoined(true);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join this group.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
        <div className="flex items-center gap-3">
          <PaperTreeMark className="h-10 w-10" />
          <div>
            <p className="text-sm font-semibold text-slate-950">PaperTree Group</p>
            <p className="text-xs text-slate-500">Shared research workspace by MIMIRtech</p>
          </div>
        </div>

        <div className="mt-8 grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-600">
          {isJoined ? <Check className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">
          {isJoined ? "You joined the group" : "Join a shared reading group"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isJoined
            ? "The group reading list is now available in your PaperTree workspace."
            : "Members share the same paper graph, reading list, and research context."}
        </p>

        <div className="mt-6 flex items-center justify-between border-y border-slate-100 py-3 text-xs">
          <span className="text-slate-400">Invite code</span>
          <span className="font-mono font-medium text-slate-700">{code || "Missing"}</span>
        </div>

        {error ? (
          <p className="mt-4 border-l-2 border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          {!code ? (
            <Link
              href="/canvas"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open PaperTree
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : isJoined ? (
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
              onClick={() => router.push("/canvas")}
            >
              Open group workspace
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : userEmail ? (
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              disabled={isJoining}
              onClick={handleJoin}
            >
              {isJoining ? "Joining..." : "Join group"}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={`/login?mode=signin&next=${encodeURIComponent(nextPath)}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              Sign in to join
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
