import type { ReactNode } from "react";
import { DashboardShell } from "@/features/layout/components/dashboard-shell";
import { AuthGuard } from "@/providers/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
