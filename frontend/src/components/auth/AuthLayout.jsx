import { Link } from "react-router-dom";
import { Logo } from "../common/Logo";
import { ThemeToggle } from "../common/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";

export function AuthLayout({ title, subtitle, footer, children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <Logo className="w-8 h-8" />
          SpecSense
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="flex-1 flex px-4 py-10">
        <div className="m-auto w-full max-w-sm animate-[popIn_0.2s_ease-out]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            {children}
          </div>
          <p className="mt-5 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </main>
    </div>
  );
}
