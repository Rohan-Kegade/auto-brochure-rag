import { Link } from "react-router-dom";
import { House } from "lucide-react";
import { Logo } from "../common/Logo";
import { Wordmark } from "../common/Wordmark";
import { PageBackdrop } from "../common/PageBackdrop";
import { ThemeToggle } from "../common/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";

export function AuthLayout({ title, subtitle, footer, children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative isolate min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PageBackdrop />
      <header>
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <Logo className="w-8 h-8" />
            <Wordmark className="hidden min-[400px]:inline" />
          </Link>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="flex-1 flex px-4 py-10">
        <div className="m-auto w-full max-w-[21rem] animate-[popIn_0.2s_ease-out]">
          <div className="text-center mb-4">
            <Link
              to="/"
              title="Back to home"
              aria-label="Back to home"
              className="inline-flex w-10 h-10 mb-3 items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <House className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-lg shadow-indigo-500/5 p-5">
            {children}
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </main>
    </div>
  );
}
