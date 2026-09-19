import { toast } from "sonner";

/** Toast-based replacement for window.confirm. Resolves true only on confirm. */
export function confirmToast(message, { confirmLabel = "Delete" } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    toast(message, {
      duration: Infinity,
      action: { label: confirmLabel, onClick: () => settle(true) },
      cancel: { label: "Cancel", onClick: () => settle(false) },
      onDismiss: () => settle(false),
      onAutoClose: () => settle(false),
    });
  });
}
