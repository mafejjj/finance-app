"use client";

import { ReactNode } from "react";

type ModalIntent = "info" | "success" | "warning" | "error";

type CenterModalProps = {
  open: boolean;
  title: string;
  message?: string;
  intent?: ModalIntent;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  children?: ReactNode;
};

const intentStyles: Record<ModalIntent, string> = {
  info: "border-slate-700",
  success: "border-emerald-500/60",
  warning: "border-amber-500/60",
  error: "border-rose-500/60",
};

export function CenterModal({
  open,
  title,
  message,
  intent = "info",
  confirmLabel = "Ok",
  cancelLabel,
  onConfirm,
  onClose,
  children,
}: CenterModalProps) {
  if (!open) return null;

  async function handleConfirm() {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70"
      />

      <div
        className={`relative z-10 w-full max-w-md animate-pop-in rounded-2xl border bg-slate-900 p-6 shadow-2xl ${
          intentStyles[intent]
        }`}
      >
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
        {children}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {cancelLabel && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-pop-in {
          animation: popIn 200ms ease-out;
        }
      `}</style>
    </div>
  );
}
