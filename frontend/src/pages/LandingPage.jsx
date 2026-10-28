import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GitCompare,
  MessageSquareText,
  Upload,
} from "lucide-react";
import { Logo } from "../components/common/Logo";
import { Wordmark } from "../components/common/Wordmark";
import { PageBackdrop } from "../components/common/PageBackdrop";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { MAX_PDFS } from "../constants/config";

const FEATURES = [
  {
    icon: Upload,
    title: "Bring your brochures",
    text: "Upload the official PDF brochures for the cars you're considering, or reuse ones from your library.",
  },
  {
    icon: MessageSquareText,
    title: "Ask in plain language",
    text: "Engine options, safety kit, boot space, variant differences: ask the way you'd ask a salesperson.",
  },
  {
    icon: GitCompare,
    title: "Compare side by side",
    text: `Add up to ${MAX_PDFS} brochures to one chat and compare price, features and specs across them.`,
  },
  {
    icon: BookOpen,
    title: "Answers you can check",
    text: "Every answer comes from the brochures themselves, with the source and page it came from.",
  },
];

const STEPS = [
  { title: "Create an account", text: "Sign up in seconds. Your chats are saved for later." },
  { title: "Add brochures", text: "Attach one brochure to explore a car, or several to compare." },
  { title: "Start asking", text: "Follow up as much as you like; the chat keeps the context." },
];

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="relative isolate min-h-screen bg-slate-50 text-slate-800">
      <PageBackdrop className="inset-x-0 top-0 h-[56rem]" />
      <header className="sticky top-0 z-10 bg-slate-50/60 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <Logo className="w-8 h-8" />
            <Wordmark className="hidden min-[400px]:inline" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {user ? (
              <Link
                to="/app"
                className="px-3.5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Open BrochureIQ
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 rounded-md"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="px-3.5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              AI research assistant for car buyers
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Ask your car brochures anything.
            </h1>
            <p className="mt-5 text-base text-slate-500 leading-relaxed max-w-lg">
              BrochureIQ reads official car brochures so you don't have to. Ask
              about specs, features and variants, compare cars side by side, and
              get answers with page references you can check.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-5 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:border-indigo-300 hover:text-indigo-700 transition-colors"
              >
                I have an account
              </Link>
            </div>
          </div>

          <ChatPreview />
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Everything in the brochure, one question away
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-9 h-9 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-lg">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ title, text }, i) => (
              <li key={title}>
                <span className="text-3xl font-bold text-indigo-200">0{i + 1}</span>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 p-6 sm:p-10 bg-linear-to-br from-indigo-600 via-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Shortlisting your next car?
              </h2>
              <p className="mt-1.5 text-sm text-white opacity-80">
                Stop flipping through PDFs. Let BrochureIQ find the answers.
              </p>
            </div>
            <Link
              to="/signup"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-white text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Create your account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 text-center">
          <span className="flex items-center gap-2">
            <Logo className="w-5 h-5" />
            <Wordmark />
          </span>
          <span>Answers are generated from the brochures you provide. Always confirm with the dealer.</span>
        </div>
      </footer>
    </div>
  );
}

// Static mock of the chat UI so visitors see what they're signing up for.
function ChatPreview() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden" aria-hidden="true">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="ml-2 text-xs font-medium text-slate-500">Compact SUV comparison</span>
      </div>
      <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap gap-2">
        {["Brochure A.pdf", "Brochure B.pdf"].map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs"
          >
            <FileText className="w-3 h-3" />
            {name}
          </span>
        ))}
      </div>
      <div className="p-4 space-y-4 bg-slate-50">
        <div className="flex justify-end">
          <p className="max-w-[80%] px-3.5 py-2.5 bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md">
            Which one has more safety features as standard?
          </p>
        </div>
        <div className="max-w-[90%] px-3.5 py-3 bg-white border border-slate-200 text-sm text-slate-700 rounded-2xl rounded-bl-md">
          <p>
            <strong className="text-slate-900">Car B</strong> includes more as
            standard: 6 airbags, ESC and hill-hold on every variant, while Car A
            reserves side airbags for its top two trims.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">Brochure B · p. 14</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">Brochure A · p. 9</span>
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-slate-200">
        <div className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-400">
          Ask a follow-up…
        </div>
      </div>
    </div>
  );
}
