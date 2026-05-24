"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { LogoMark } from "@/shared/components/brand/logo";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useUiStore } from "@/stores/ui.store";
import {
  isNavGroup,
  navSections,
  type NavGroup,
  type NavItem,
} from "../nav.config";

function MobileLink({
  item,
  active,
  nested,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
        active
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-surface-strong hover:text-foreground",
        nested && "pl-9",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-primary" : "")}
      />
      {item.label}
    </Link>
  );
}

function MobileGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = group.icon;
  const hasActive = group.items.some(
    (it) => pathname === it.href || pathname.startsWith(`${it.href}/`),
  );
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
          hasActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-surface-strong hover:text-foreground",
        )}
        aria-expanded={open}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            hasActive ? "text-primary" : "",
          )}
        />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open
        ? group.items.map((item) => (
            <MobileLink
              key={item.href}
              item={item}
              active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
              nested
              onNavigate={onNavigate}
            />
          ))
        : null}
    </div>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const open = useUiStore((s) => s.mobileSidebarOpen);
  const setOpen = useUiStore((s) => s.setMobileSidebarOpen);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-surface transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} className="brand-glow rounded-lg" />
            <span className="text-sm font-semibold tracking-tight">
              Purpura Admin
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navSections.map((section) => {
            const visible = section.entries.filter((entry) =>
              !entry.roles ||
              (user ? entry.roles.includes(user.role) : false),
            );
            if (visible.length === 0) return null;
            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                  {section.title}
                </p>
                {visible.map((entry) =>
                  isNavGroup(entry) ? (
                    <MobileGroup
                      key={`group-${entry.label}`}
                      group={entry}
                      pathname={pathname}
                      onNavigate={() => setOpen(false)}
                    />
                  ) : (
                    <MobileLink
                      key={entry.href}
                      item={entry}
                      active={isActive(entry.href)}
                      onNavigate={() => setOpen(false)}
                    />
                  ),
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
