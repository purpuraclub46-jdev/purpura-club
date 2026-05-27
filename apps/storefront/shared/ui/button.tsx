"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9810FA] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[#0A0A0A] text-white hover:bg-[#9810FA] shadow-sm",
        accent:
          "bg-[#9810FA] text-white hover:bg-[#7c0fcc] shadow-[0_8px_20px_-10px_rgba(152,16,250,0.65)]",
        outline:
          "border border-[#11111122] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#FAFAFA]",
        ghost:
          "text-[#0A0A0A]/75 hover:bg-[#11111108] hover:text-[#0A0A0A]",
        link: "text-[#9810FA] underline-offset-4 hover:underline",
        destructive:
          "bg-[#e11d48] text-white hover:bg-[#be123c] shadow-sm",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-sm tracking-wide",
        xl: "h-14 px-8 text-base tracking-wide",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, type, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
