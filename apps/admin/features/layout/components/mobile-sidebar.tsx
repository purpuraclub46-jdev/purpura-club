"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { userHasAnyPermission } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import {
  isNavGroup,
  navSections,
  type NavEntry,
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[#9810FA]/8 text-[#0A0A0A]"
          : "text-[#0A0A0A]/65 hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]",
        nested && "pl-9",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-[#9810FA]" : "text-[#0A0A0A]/55",
        )}
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
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActive
            ? "text-[#0A0A0A]"
            : "text-[#0A0A0A]/65 hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]",
        )}
        aria-expanded={open}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            hasActive ? "text-[#9810FA]" : "text-[#0A0A0A]/55",
          )}
        />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[#0A0A0A]/40 transition-transform",
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
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[#11111111] bg-white shadow-2xl transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#11111111] px-4">
          <Image
            src="/brand/logotipo-nuevo-1.svg"
            alt="Purpura Club"
            width={213}
            height={80}
            priority
            className="h-8 w-auto"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-md p-2 text-[#0A0A0A]/60 transition-colors hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navSections.map((section) => {
            const filterEntry = (entry: NavEntry): boolean => {
              if (entry.roles && (!user || !entry.roles.includes(user.role))) {
                return false;
              }
              if (entry.anyPermission && entry.anyPermission.length > 0) {
                if (!userHasAnyPermission(user, entry.anyPermission)) {
                  return false;
                }
              }
              return true;
            };

            const visible = section.entries
              .map((entry) => {
                if (!filterEntry(entry)) return null;
                if (isNavGroup(entry)) {
                  const items = entry.items.filter(filterEntry);
                  if (items.length === 0) return null;
                  return { ...entry, items } as NavGroup;
                }
                return entry;
              })
              .filter((e): e is NavEntry => e !== null);

            if (visible.length === 0) return null;
            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/40">
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
