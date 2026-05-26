"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { userHasAnyPermission } from "@/stores/auth.store";

interface PosGuardProps {
  children: React.ReactNode;
}

/**
 * Guard del POS standalone:
 *  - Exige sesión activa.
 *  - Exige permiso `pos.access` (cajeros y admins lo tienen). SUPER_ADMIN
 *    siempre pasa.
 *  - Si el usuario está autenticado pero NO tiene `pos.access` lo manda al
 *    dashboard admin con mensaje (en lugar de tirarlo al login).
 */
export function PosGuard({ children }: PosGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, user } = useAuth();

  const canAccess = userHasAnyPermission(user, ["pos.access"]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }
    if (!canAccess) {
      router.replace("/?error=pos-forbidden");
    }
  }, [hydrated, isAuthenticated, canAccess, pathname, router]);

  if (!hydrated || !isAuthenticated || !canAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="size-6 animate-spin text-[#9810FA]" />
      </div>
    );
  }

  return <>{children}</>;
}
