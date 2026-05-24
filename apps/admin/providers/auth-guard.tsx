"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }
    if (!isAdmin) {
      router.replace("/login?error=forbidden");
    }
  }, [hydrated, isAuthenticated, isAdmin, pathname, router]);

  if (!hydrated || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
