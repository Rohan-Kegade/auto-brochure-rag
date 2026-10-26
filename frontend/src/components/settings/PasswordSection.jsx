import { useState } from "react";
import { toast } from "sonner";
import { changePasswordApi } from "../../api/auth";
import { FormField } from "../common/FormField";
import { FormError, SubmitButton } from "../common/SubmitButton";
import { getErrorMessage } from "../../utils/errors";
import { validatePassword } from "../../utils/validation";
import { SettingsSection } from "./SettingsSection";

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

export function PasswordSection() {
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {
      current: form.current ? null : "Enter your current password.",
      next: validatePassword(form.next),
      confirm: form.confirm === form.next ? null : "Passwords don't match.",
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsSaving(true);
    try {
      await changePasswordApi({ currentPassword: form.current, newPassword: form.next });
      setForm(EMPTY_PASSWORDS);
      toast.success("Password changed. Other devices have been logged out.");
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't change your password."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection
      title="Change password"
      description="Changing it logs you out on every other device."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <FormField
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={update("current")}
          error={errors.current}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={update("next")}
            error={errors.next}
          />
          <FormField
            id="confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update("confirm")}
            error={errors.confirm}
          />
        </div>
        <SubmitButton isLoading={isSaving} loadingLabel="Changing…" className="w-full sm:w-auto">
          Change password
        </SubmitButton>
      </form>
    </SettingsSection>
  );
}
