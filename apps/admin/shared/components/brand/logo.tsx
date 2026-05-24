import * as React from "react";
import { cn } from "@/shared/lib/cn";

interface LogoMarkProps extends React.SVGAttributes<SVGElement> {
  size?: number;
}

/**
 * Brand mark — placeholder geometry. Swap the SVG paths for the official
 * Purpura Club asset once it lands; the component API stays the same.
 */
export function LogoMark({
  size = 32,
  className,
  ...props
}: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <defs>
        <linearGradient id="pp-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9810FA" />
          <stop offset="1" stopColor="#C026D3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="8" fill="url(#pp-mark)" />
      <path
        d="M11 9h6.8c3.5 0 5.7 2.1 5.7 5.2 0 3.3-2.3 5.4-5.9 5.4H14v4.4h-3V9zm3 2.8v5h3.4c2 0 3.1-1 3.1-2.5s-1-2.5-3-2.5H14z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { mark: 28, title: "text-sm", tagline: "text-[9px]" },
  md: { mark: 36, title: "text-base", tagline: "text-[10px]" },
  lg: { mark: 44, title: "text-lg", tagline: "text-[11px]" },
} as const;

export function Logo({
  className,
  showTagline = true,
  size = "md",
}: LogoProps) {
  const sz = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={sz.mark} />
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            sz.title,
          )}
        >
          Purpura Club
        </span>
        {showTagline ? (
          <span
            className={cn(
              "uppercase tracking-[0.22em] text-muted-foreground",
              sz.tagline,
            )}
          >
            Admin
          </span>
        ) : null}
      </div>
    </div>
  );
}
