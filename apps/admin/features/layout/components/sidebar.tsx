"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
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

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
}

function SidebarLink({ item, active, collapsed, nested }: SidebarLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-[#9810FA]/8 text-[#0A0A0A]"
          : "text-[#0A0A0A]/65 hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]",
        collapsed && "justify-center px-2",
        nested && !collapsed && "pl-9",
      )}
      title={collapsed ? item.label : undefined}
    >
      {active && !nested ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1.5 w-[3px] rounded-full bg-[#9810FA]",
            collapsed ? "left-0.5" : "left-0",
          )}
        />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-[#9810FA]" : "text-[#0A0A0A]/55 group-hover:text-[#9810FA]",
        )}
      />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

interface SidebarGroupProps {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
}

function SidebarGroup({ group, collapsed, pathname }: SidebarGroupProps) {
  const Icon = group.icon;
  const hasActive = group.items.some(
    (it) => pathname === it.href || pathname.startsWith(`${it.href}/`),
  );
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            }
            collapsed
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActive
            ? "text-[#0A0A0A]"
            : "text-[#0A0A0A]/65 hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]",
        )}
        aria-expanded={open}
      >
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            hasActive ? "text-[#9810FA]" : "text-[#0A0A0A]/55",
          )}
        />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[#0A0A0A]/40 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-1">
          {group.items.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
              collapsed={false}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-[#11111111] bg-white transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      {/* ─── Brand header ─── */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-[#11111111] px-4",
          collapsed ? "justify-center px-2" : "gap-2",
        )}
      >
        <Link
          href="/"
          aria-label="Purpura Club admin"
          className="flex items-center"
        >
          {collapsed ? (
            <Image
              src="/brand/isotipo-nuevo.svg"
              alt=""
              width={28}
              height={28}
              priority
              className="size-7"
            />
          ) : (
            <Image
              src="/brand/logotipo-nuevo-1.svg"
              alt="Purpura Club"
              width={213}
              height={80}
              priority
              className="h-8 w-auto"
            />
          )}
        </Link>
      </div>

      {/* ─── Nav ─── */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navSections.map((section) => {
          const filterEntry = (entry: NavEntry): boolean => {
            if (entry.roles && (!user || !entry.roles.includes(user.role))) {
              return false;
            }
            if (entry.anyPermission && entry.anyPermission.length > 0) {
              if (!userHasAnyPermission(user, entry.anyPermission)) return false;
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
              {!collapsed ? (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/40">
                  {section.title}
                </p>
              ) : null}
              {visible.map((entry) =>
                isNavGroup(entry) ? (
                  <SidebarGroup
                    key={`group-${entry.label}`}
                    group={entry}
                    collapsed={collapsed}
                    pathname={pathname}
                  />
                ) : (
                  <SidebarLink
                    key={entry.href}
                    item={entry}
                    active={isActive(entry.href)}
                    collapsed={collapsed}
                  />
                ),
              )}
            </div>
          );
        })}
      </nav>

      {/* ─── Collapse toggle ─── */}
      <div className="border-t border-[#11111111] p-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#0A0A0A]/55 transition-colors hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          <ChevronsLeft
            className={cn(
              "size-4 shrink-0 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed ? <span>Contraer</span> : null}
        </button>
      </div>
    </aside>
  );
}
