import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export function FormField({ id, label, type = "text", error, hint, ...inputProps }) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  // A disabled field shows a lock so it reads as fixed, not just greyed out.
  const isLocked = Boolean(inputProps.disabled) && !isPassword;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed ${
            error ? "border-red-400" : "border-slate-300"
          } ${isPassword || isLocked ? "pr-10" : ""}`}
          {...inputProps}
        />
        {isLocked && (
          <Lock
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            title={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-indigo-600 focus:outline-none focus-visible:text-indigo-600 cursor-pointer"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
