"use client";

import * as React from "react";
import { cn } from "@/shared/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        className={cn(
          "h-11 w-full rounded-lg border border-[#11111122] bg-white px-4 text-sm text-[#0A0A0A] placeholder:text-[#0A0A0A]/35 transition-colors focus:border-[#9810FA] focus:outline-none focus:ring-2 focus:ring-[#9810FA]/15 disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:opacity-70",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-[#11111122] bg-white px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#0A0A0A]/35 transition-colors focus:border-[#9810FA] focus:outline-none focus:ring-2 focus:ring-[#9810FA]/15 disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
