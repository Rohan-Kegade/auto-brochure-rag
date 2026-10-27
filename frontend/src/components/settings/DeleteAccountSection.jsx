import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { FormField } from "../common/FormField";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errors";
import { SettingsSection } from "./SettingsSection";

export function DeleteAccountSection() {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return setError("Enter your password to confirm.");
    setIsDeleting(true);
    try {
      await deleteAccount({ password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't delete your account."));
      setIsDeleting(false);
    }
  };

  return (
    <SettingsSection
      title="Delete account"
      description="Permanently deletes your account, all your chats and every brochure you've uploaded. This can't be undone."
      danger
    >
      {confirming ? (
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField
            id="delete-password"
            label="Enter your password to confirm"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            error={error}
          />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setError(null);
              }}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-medium text-white disabled:opacity-60 cursor-pointer"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isDeleting ? "Deleting…" : "Delete my account"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex sm:justify-end">
          <button
            onClick={() => setConfirming(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
          >
            Delete account
          </button>
        </div>
      )}
    </SettingsSection>
  );
}
