import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

export function ConfirmDialog({
  title,
  description,
  detail,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_120ms_ease-out]"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center animate-[popIn_160ms_ease-out]"
      >
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 ring-8 ring-red-50/60 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {detail && (
          <p
            className="mt-2 mx-auto max-w-full truncate px-3 py-1 bg-slate-100 rounded-lg text-sm font-medium text-slate-700"
            title={detail}
          >
            {detail}
          </p>
        )}
        <p className="mt-3 text-sm text-slate-500">{description}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={busy}
            className="py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-medium text-white shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
