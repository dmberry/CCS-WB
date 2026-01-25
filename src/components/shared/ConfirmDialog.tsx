"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button when dialog opens
  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-[100]"
      onClick={onCancel}
    >
      <div
        className="bg-popover rounded-sm shadow-lg w-full max-w-xs mx-4 modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="px-6 py-4">
          <h3 className="font-display text-caption text-ink">{title}</h3>
          {message && (
            <p className="mt-1.5 font-sans text-[10px] text-slate-muted">{message}</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-parchment" />

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 font-sans text-caption text-slate hover:text-ink transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={cn(
              "px-3 py-1.5 font-sans text-caption font-medium rounded-sm border transition-colors",
              variant === "danger"
                ? "text-error border-error/30 hover:bg-error/10"
                : "text-accent border-accent/30 hover:bg-accent/10"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
