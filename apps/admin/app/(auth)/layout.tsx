import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 size-[480px] rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-[420px] rounded-full bg-accent/20 blur-3xl" />
      </div>
      {children}
    </div>
  );
}
