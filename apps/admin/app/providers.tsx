"use client";

import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/shared/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster />
    </QueryProvider>
  );
}
