"use client";

import { useMemo } from "react";
import { Check, Square } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { PermissionEntity } from "../types";

interface Props {
  permissions: PermissionEntity[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}

/**
 * Matriz visual de permisos agrupada por módulo.
 * Permite seleccionar/deseleccionar de forma individual o por módulo completo.
 */
export function PermissionsMatrix({
  permissions,
  selectedKeys,
  onChange,
  disabled = false,
}: Props) {
  const selected = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const grouped = useMemo(() => {
    const byModule = new Map<string, PermissionEntity[]>();
    for (const p of permissions) {
      const list = byModule.get(p.module) ?? [];
      list.push(p);
      byModule.set(p.module, list);
    }
    return [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const togglePermission = (key: string) => {
    if (disabled) return;
    if (selected.has(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const toggleModule = (perms: PermissionEntity[]) => {
    if (disabled) return;
    const keys = perms.map((p) => p.key);
    const allSelected = keys.every((k) => selected.has(k));
    if (allSelected) {
      onChange(selectedKeys.filter((k) => !keys.includes(k)));
    } else {
      const next = new Set(selectedKeys);
      keys.forEach((k) => next.add(k));
      onChange([...next]);
    }
  };

  if (permissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando catálogo de permisos…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([module, perms]) => {
        const moduleKeys = perms.map((p) => p.key);
        const allSelected = moduleKeys.every((k) => selected.has(k));
        const someSelected =
          !allSelected && moduleKeys.some((k) => selected.has(k));

        return (
          <div
            key={module}
            className="overflow-hidden rounded-xl border border-border bg-surface/40"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleModule(perms)}
              className={cn(
                "flex w-full items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 text-left transition-colors",
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-surface-strong",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded border transition-colors",
                    allSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : someSelected
                        ? "border-primary bg-primary/30 text-primary"
                        : "border-border-strong bg-transparent text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {allSelected ? (
                    <Check className="size-3" />
                  ) : someSelected ? (
                    <span className="size-2 rounded-sm bg-primary" />
                  ) : (
                    <Square className="size-3" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{module}</p>
                  <p className="text-xs text-muted-foreground">
                    {moduleKeys.filter((k) => selected.has(k)).length} /{" "}
                    {moduleKeys.length} permisos
                  </p>
                </div>
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {allSelected
                  ? "Todos"
                  : someSelected
                    ? "Parcial"
                    : "Ninguno"}
              </span>
            </button>

            <div className="divide-y divide-border/60">
              {perms.map((p) => {
                const checked = selected.has(p.key);
                return (
                  <label
                    key={p.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                      disabled
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-surface-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => togglePermission(p.key)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{p.name}</span>
                        <code className="rounded bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {p.key}
                        </code>
                      </div>
                      {p.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
