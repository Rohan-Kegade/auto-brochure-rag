import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { FormField } from "../components/common/FormField";
import { FormError, SubmitButton } from "../components/common/SubmitButton";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/errors";
import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
} from "../utils/validation";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {
      name: form.name.trim() ? null : "Enter your name.",
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm:
        form.confirm === form.password ? null : "Passwords don't match.",
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsLoading(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/app", { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't create your account."));
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start asking your car brochures questions."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <FormField
          id="name"
          label="Name"
          autoComplete="name"
          placeholder="Your name"
          value={form.name}
          onChange={update("name")}
          error={errors.name}
          autoFocus
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update("email")}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
        <FormField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirm}
          onChange={update("confirm")}
          error={errors.confirm}
        />
        <SubmitButton isLoading={isLoading} loadingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
