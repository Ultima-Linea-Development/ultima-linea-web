"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icons";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

type AlertVariant = "destructive" | "default";

const variantStyles: Record<AlertVariant, string> = {
  destructive: "bg-destructive/10 border-destructive/20",
  default: "bg-background border-border",
};

type ToastAlertProps = {
  open: boolean;
  message: string;
  variant?: AlertVariant;
  duration?: number;
  onClose: () => void;
  onUndo?: () => void;
  undoLabel?: string;
};

export default function Alert({
  open,
  message,
  variant = "default",
  duration = 5000,
  onClose,
  onUndo,
  undoLabel = "Deshacer",
}: ToastAlertProps) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !message) return;

    setProgress(100);
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (startRef.current == null) return;

      const elapsed = now - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        onClose();
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [open, message, duration, onClose]);

  if (!open || !message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "fixed top-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm border shadow-sm",
        "sm:top-6 sm:right-6",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <Typography
          variant="body2"
          color={variant === "destructive" ? "destructive" : "default"}
          className="min-w-0 flex-1 pt-0.5"
        >
          {message}
        </Typography>
        {onUndo && (
          <button
            type="button"
            className="shrink-0 cursor-pointer px-1 pt-0.5 text-sm font-medium underline underline-offset-2 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={onUndo}
          >
            {undoLabel}
          </button>
        )}
        <button
          type="button"
          className="shrink-0 cursor-pointer p-1 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Cerrar aviso"
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="h-1 w-full">
        <div className="h-full bg-black" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

type InlineAlertPadding = "sm" | "md";

type InlineAlertProps = Omit<HTMLAttributes<HTMLDivElement>, "className"> & {
  variant?: AlertVariant;
  padding?: InlineAlertPadding;
  border?: boolean;
  children: ReactNode;
};

const paddingStyles: Record<InlineAlertPadding, string> = {
  sm: "p-2",
  md: "p-3",
};

export const InlineAlert = forwardRef<HTMLDivElement, InlineAlertProps>(
  ({ variant = "destructive", padding = "md", border = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantStyles[variant],
          paddingStyles[padding],
          border && "border"
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

InlineAlert.displayName = "InlineAlert";
