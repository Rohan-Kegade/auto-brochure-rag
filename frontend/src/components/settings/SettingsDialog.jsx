import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  KeyRound,
  Library,
  Loader2,
  Search,
  Trash2,
  Upload,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { changePasswordApi } from "../../api/auth";
import { deleteDocumentApi, searchDocumentsApi, uploadDocumentsApi } from "../../api/api";
import { AuthField } from "../auth/AuthField";
import { FormError, SubmitButton } from "../auth/SubmitButton";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { MAX_PDFS } from "../../constants/config";
import { filterPdfs } from "../../hooks/useChatDocuments";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errors";
import { formatBytes, formatDate } from "../../utils/format";
import { validatePassword } from "../../utils/validation";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function Section({ title, description, danger = false, children }) {
  return (
    <section>
      <h3 className={`text-base font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection() {
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
    <Section title="Profile" description="Your name and the email you log in with.">
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
        <AuthField
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
        <AuthField
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
    </Section>
  );
}

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function PasswordSection() {
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
    <Section
      title="Change password"
      description="Changing it logs you out on every other device."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <AuthField
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={update("current")}
          error={errors.current}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={update("next")}
            error={errors.next}
          />
          <AuthField
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
    </Section>
  );
}

function BrochuresSection({ onDocumentDeleted }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await searchDocumentsApi({ q: query.trim(), limit: PAGE_SIZE });
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, "Couldn't load your brochures."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, reloadKey]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const data = await searchDocumentsApi({
        q: query.trim(),
        limit: PAGE_SIZE,
        offset: result.items.length,
      });
      setResult((prev) => ({
        items: [...prev.items, ...data.items.filter((d) => !prev.items.some((p) => p.id === d.id))],
        total: data.total,
      }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't load more brochures."));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const upload = async (e) => {
    let files = filterPdfs(Array.from(e.target.files || []));
    e.target.value = "";
    if (files.length > MAX_PDFS) {
      toast.warning(`You can upload up to ${MAX_PDFS} PDFs at a time; uploading the first ${MAX_PDFS}.`);
      files = files.slice(0, MAX_PDFS);
    }
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const { results } = await uploadDocumentsApi(files);
      results
        .filter((r) => r.error)
        .forEach((r) => toast.warning(`${r.filename}: ${r.error}`));
      const created = results.filter((r) => r.outcome === "created").length;
      const existing = results.filter((r) => r.outcome === "existing").length;
      if (created > 0) {
        toast.success(`${created} brochure${created > 1 ? "s" : ""} added to your library.`);
      }
      if (existing > 0) {
        toast.info(`${existing} brochure${existing > 1 ? "s were" : " was"} already in your library.`);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload brochures."));
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (doc) => {
    try {
      await deleteDocumentApi(doc.id);
      setResult((prev) => ({
        items: prev.items.filter((d) => d.id !== doc.id),
        total: Math.max(0, prev.total - 1),
      }));
      onDocumentDeleted(doc.id);
      toast.success(`${doc.filename} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the brochure."));
    }
  };

  return (
    <Section
      title="My brochures"
      description="Every PDF you've uploaded. Deleting one also removes it from the chats that use it."
    >
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={upload} />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename..."
            aria-label="Search brochures"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? "Processing…" : "Upload PDFs"}
        </button>
      </div>

      <ul className="mt-4 space-y-1.5">
        {isLoading && (
          <li className="py-6 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </li>
        )}
        {!isLoading && result.items.length === 0 && (
          <li className="text-sm text-slate-400 italic py-6 text-center">
            {query ? "No brochures match your search." : "You haven't uploaded any brochures yet."}
          </li>
        )}
        {!isLoading &&
          result.items.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-lg"
            >
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-700 truncate" title={doc.filename}>
                  {doc.filename}
                </div>
                <div className="text-[11px] text-slate-400">
                  {formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}
                </div>
              </div>
              <button
                onClick={() => setPendingDelete(doc)}
                title="Delete brochure"
                aria-label={`Delete ${doc.filename}`}
                className="p-2 -mr-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
      </ul>

      {!isLoading && result.items.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Showing {result.items.length} of {result.total}
          </span>
          {result.items.length < result.total && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-60 cursor-pointer"
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this brochure?"
          detail={pendingDelete.filename}
          description="It will be removed from your library and from every chat that uses it. This can't be undone."
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </Section>
  );
}

function DeleteAccountSection() {
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
    <Section
      title="Delete account"
      description="Permanently deletes your account, all your chats and every brochure you've uploaded. This can't be undone."
      danger
    >
      {confirming ? (
        <form onSubmit={submit} noValidate className="space-y-4">
          <AuthField
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
          <div className="flex flex-col-reverse sm:flex-row gap-3">
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
        <button
          onClick={() => setConfirming(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
        >
          Delete account
        </button>
      )}
    </Section>
  );
}

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "brochures", label: "My brochures", icon: Library },
  { id: "delete-account", label: "Delete account", icon: UserX, danger: true },
];

export function SettingsDialog({ onDocumentDeleted, onClose }) {
  const [active, setActive] = useState("profile");

  useEffect(() => {
    // A ConfirmDialog on top handles (and stops) its own Escape first.
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 flex items-center justify-center p-2 sm:p-4 animate-[fadeIn_120ms_ease-out]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[38rem] max-h-full flex flex-col overflow-hidden animate-[popIn_160ms_ease-out]"
      >
        <div className="h-14 shrink-0 px-4 sm:px-5 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Settings</h2>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close settings"
            className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Icons only on phones, so the open section keeps most of the width. */}
          <nav
            aria-label="Settings sections"
            className="shrink-0 w-14 sm:w-48 p-2 sm:p-3 border-r border-slate-200 bg-slate-50 flex flex-col gap-1"
          >
            {SECTIONS.map(({ id, label, icon: Icon, danger }) => {
              const selected = id === active;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  title={label}
                  aria-label={label}
                  aria-current={selected ? "page" : undefined}
                  className={`flex items-center justify-center sm:justify-start gap-2.5 p-2.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                    selected
                      ? danger
                        ? "bg-red-50 text-red-600"
                        : "bg-white text-indigo-700 shadow-xs"
                      : danger
                        ? "text-red-500 hover:bg-red-50"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
            {active === "profile" && <ProfileSection />}
            {active === "password" && <PasswordSection />}
            {active === "brochures" && <BrochuresSection onDocumentDeleted={onDocumentDeleted} />}
            {active === "delete-account" && <DeleteAccountSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
