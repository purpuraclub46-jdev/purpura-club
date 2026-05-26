"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { PermissionsOverview } from "@/features/roles/components/permissions-overview";
import {
  usePermissions,
  useRolesList,
} from "@/features/roles/hooks/use-rbac";

export default function PermisosPage() {
  const { data: permissions, isLoading: loadingPerms } = usePermissions();
  const { data: rolesPage, isLoading: loadingRoles } = useRolesList({
    limit: 100,
    active: true,
  });

  const roles = rolesPage?.items ?? [];
  const perms = permissions ?? [];

  return (
    <>
      <PageHeader
        title="Permisos"
        description="Catálogo canónico del sistema. Cada celda muestra si el rol otorga el permiso. SUPER_ADMIN siempre lo tiene todo."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Matriz roles × permisos</span>
            <span className="text-xs font-normal text-muted-foreground">
              {perms.length} permisos · {roles.length} roles activos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPerms || loadingRoles ? (
            <p className="text-sm text-muted-foreground">
              Cargando catálogo…
            </p>
          ) : (
            <PermissionsOverview permissions={perms} roles={roles} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
