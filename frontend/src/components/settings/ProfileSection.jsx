import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "../common/FormField";
import { SubmitButton } from "../common/SubmitButton";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errors";
import { formatDate } from "../../utils/format";
import { SettingsSection } from "./SettingsSection";

export function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const changed = name.trim() !== user.name;

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't update your profile."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection title="Profile" description="Your name and the email you log in with.">
      <div className="flex items-center gap-3 mb-5">
        <span
          className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-lg font-semibold"
          aria-hidden="true"
        >
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
          <p className="text-xs text-slate-400">Member since {formatDate(user.created_at)}</p>
        </div>
      </div>
      <form onSubmit={save} noValidate className="space-y-4">
        <FormField
          id="profile-name"
          label="Name"
          autoComplete="name"
          maxLength={255}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          error={error}
        />
        <FormField
          id="profile-email"
          label="Email"
          type="email"
          value={user.email}
          readOnly
          disabled
          hint="Your email can't be changed."
        />
        {changed && (
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setName(user.name);
                setError(null);
              }}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <SubmitButton isLoading={isSaving} loadingLabel="Saving…" className="w-full sm:w-auto">
              Save changes
            </SubmitButton>
          </div>
        )}
      </form>
    </SettingsSection>
  );
}
