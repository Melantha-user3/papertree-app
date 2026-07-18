import type { Metadata } from "next";
import { GroupJoinCard } from "@/components/groups/group-join-card";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Join Group",
  description: "Join a shared PaperTree research group.",
};

interface JoinPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const [{ code }, user] = await Promise.all([searchParams, getAuthenticatedUser()]);

  return (
    <GroupJoinCard
      code={code?.trim() || ""}
      userEmail={user?.email ?? user?.id ?? null}
    />
  );
}
