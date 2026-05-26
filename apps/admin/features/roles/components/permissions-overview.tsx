"use client";

import { Fragment, useMemo } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { PermissionEntity, RoleEntity } from "../types";

interface Props {
  permissions: PermissionEntity[];
  roles: RoleEntity[];
}

/**
 * Vista de auditoría: una matriz visual con todos los permisos del sistema
 * en filas y todos los roles activos en columnas. ✓ = el rol otorga el permiso.
 * Útil para confirmar cobertura antes de salir a producción.
 */
export function PermissionsOverview({ permissions, roles }: Props) {
  const grouped = useMemo(() => {
    const byModule = new Map<string, PermissionEntity[]>();
    for (const p of permissions) {
      const list = byModule.get(p.module) ?? [];
      list.push(p);
      byModule.set(p.module, list);
    }
    return [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.slug === "super_admin") return -1;
        if (b.slug === "super_admin") return 1;
        return a.name.localeCompare(b.name);
      }),
    [roles],
  );

  if (permissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando catálogo de permisos…
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-65 bg-surface">
              Permiso
            </TableHead>
            {sortedRoles.map((r) => (
              <TableHead key={r.id} className="text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-medium">{r.name}</span>
                  <code className="text-[9px] text-muted-foreground">
                    {r.slug}
                  </code>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map(([module, perms]) => (
            <Fragment key={`module-${module}`}>
              <TableRow className="bg-surface-strong/60">
                <TableCell
                  colSpan={1 + sortedRoles.length}
                  className="sticky left-0 z-10 bg-surface-strong/60 text-xs uppercase tracking-wider text-muted-foreground"
                >
                  {module}
                </TableCell>
              </TableRow>
              {perms.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="sticky left-0 z-10 bg-surface/95">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{p.name}</span>
                      <code className="text-[10px] text-muted-foreground">
                        {p.key}
                      </code>
                    </div>
                  </TableCell>
                  {sortedRoles.map((r) => {
                    const granted =
                      r.slug === "super_admin" ||
                      r.permissionKeys.includes(p.key);
                    return (
                      <TableCell
                        key={`${r.id}-${p.id}`}
                        className="text-center"
                      >
                        <span
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-full",
                            granted
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground",
                          )}
                          aria-label={granted ? "Otorgado" : "No otorgado"}
                        >
                          {granted ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Minus className="size-3.5 opacity-40" />
                          )}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
