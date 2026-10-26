import { Loader2 } from "lucide-react";

export function SubmitButton({ isLoading, loadingLabel, className = "w-full", children }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`${className} flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors cursor-pointer`}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading ? loadingLabel : children}
    </button>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
      {message}
    </div>
  );
}
