"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
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
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-surface-strong hover:text-foreground",
        collapsed && "justify-center px-2",
        nested && !collapsed && "pl-9",
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground",
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
            ? "text-foreground"
            : "text-muted-foreground hover:bg-surface-strong hover:text-foreground",
        )}
        aria-expanded={open}
      >
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            hasActive ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
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
        "hidden h-screen sticky top-0 shrink-0 border-r border-border bg-surface/40 backdrop-blur-md transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-17" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-border px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <LogoMark size={36} className="brand-glow rounded-lg" />
        {!collapsed ? (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Purpura Club
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Admin
            </span>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navSections.map((section) => {
          const visible = section.entries.filter((entry) =>
            isNavGroup(entry)
              ? !entry.roles ||
                (user ? entry.roles.includes(user.role) : false)
              : !entry.roles ||
                (user ? entry.roles.includes(user.role) : false),
          );
          if (visible.length === 0) return null;
          return (
            <div key={section.title} className="space-y-1">
              {!collapsed ? (
                <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
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

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn("w-full", collapsed && "px-0")}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          <ChevronsLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed ? <span>Contraer</span> : null}
        </Button>
      </div>
    </aside>
  );
}
