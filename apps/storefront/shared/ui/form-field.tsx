"use client";

import * as React from "react";
import { cn } from "@/shared/lib/cn";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  description,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]/65"
      >
        {label}
        {required ? (
          <span className="ml-1 text-[#9810FA]">*</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[#e11d48]">{error}</p>
      ) : description ? (
        <p className="text-[11px] text-[#0A0A0A]/45">{description}</p>
      ) : null}
    </div>
  );
}
