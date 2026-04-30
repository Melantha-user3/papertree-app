import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getAuthenticatedUser();

  return (
    <DashboardShell userEmail={user?.email || user?.id || null}>
      {children}
    </DashboardShell>
  );
}
