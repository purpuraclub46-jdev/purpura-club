"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useUiStore } from "@/stores/ui.store";
import { isNavGroup, navSections } from "../nav.config";
import { UserMenu } from "./user-menu";

const findPageTitle = (pathname: string): string => {
  if (pathname === "/") return "Dashboard";
  for (const section of navSections) {
    for (const entry of section.entries) {
      if (isNavGroup(entry)) {
        for (const item of entry.items) {
          if (item.href !== "/" && pathname.startsWith(item.href)) {
            return item.label;
          }
        }
      } else if (entry.href !== "/" && pathname.startsWith(entry.href)) {
        return entry.label;
      }
    }
  }
  return "Dashboard";
};

export function Header() {
  const pathname = usePathname();
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#11111111] bg-white/85 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden rounded-md p-2 text-[#0A0A0A]/65 transition-colors hover:bg-[#9810FA]/5 hover:text-[#0A0A0A]"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
            Purpura Club
          </span>
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            {findPageTitle(pathname)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
