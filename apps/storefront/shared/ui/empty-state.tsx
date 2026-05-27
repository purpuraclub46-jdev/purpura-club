import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#11111118] bg-[#FAFAFA] p-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-[#9810FA]/8 text-[#9810FA]">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[#0A0A0A]">{title}</h3>
        {description ? (
          <p className="max-w-sm text-sm text-[#0A0A0A]/55">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
