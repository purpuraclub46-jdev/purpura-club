"use client";

import { useToastStore } from "@/stores/toast.store";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, variant, duration }) => (
        <Toast
          key={id}
          variant={variant}
          duration={duration ?? 5000}
          onOpenChange={(open) => {
            if (!open) dismiss(id);
          }}
        >
          <div className="flex flex-col gap-0.5">
            <ToastTitle>{title}</ToastTitle>
            {description ? (
              <ToastDescription>{description}</ToastDescription>
            ) : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
