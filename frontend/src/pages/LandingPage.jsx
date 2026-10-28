import { Link } from "react-router-dom";
import { ArrowRight, BookMarked, Files, Sparkles } from "lucide-react";
import { Logo } from "../components/common/Logo";
import { Wordmark } from "../components/common/Wordmark";
import { PageBackdrop } from "../components/common/PageBackdrop";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { HeroDemo } from "../components/landing/HeroDemo";
import { QuestionTicker } from "../components/landing/QuestionTicker";
import { CompareShowcase } from "../components/landing/CompareShowcase";
import { SpecSheet } from "../components/landing/SpecSheet";
import { HowItWorks } from "../components/landing/HowItWorks";
import { Reveal } from "../components/landing/Reveal";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { MAX_PDFS } from "../constants/config";

const NAV = [
  { id: "demo", label: "Demo" },
  { id: "compare", label: "Compare" },
  { id: "specs", label: "Specs" },
  { id: "how", label: "How it works" },
];

const PRIMARY_BUTTON =
  "group inline-flex items-center gap-2 bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const reduced = useReducedMotion();

  // Smooth-scroll the in-page links without making every scroll in the app smooth.
  const scrollTo = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  const startLink = user ? "/app" : "/signup";
  const startLabel = user ? "Open BrochureIQ" : "Get started free";

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-slate-50 text-slate-800">
      <PageBackdrop className="inset-x-0 top-0 h-[60rem]" pattern="print" />

      <header className="sticky top-0 z-20 bg-slate-50/70 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <Logo className="w-8 h-8" />
            <Wordmark className="hidden min-[400px]:inline" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Sections">
            {NAV.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => scrollTo(e, id)}
                className="px-3 py-2 text-sm text-slate-500 hover:text-indigo-600 rounded-md transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {user ? (
              <Link to="/app" className={`${PRIMARY_BUTTON} px-3.5 py-2 text-sm rounded-lg`}>
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
                <Link to="/signup" className={`${PRIMARY_BUTTON} px-3.5 py-2 text-sm rounded-lg`}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 lg:pt-24 lg:pb-28 grid gap-16 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="animate-[popIn_0.5s_ease-out]">
            <span className="inline-flex items-center gap-2 pl-1 pr-3 py-1 bg-white/80 border border-slate-200 rounded-full text-xs text-slate-600 shadow-sm">
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-semibold uppercase tracking-wider">
                New
              </span>
              Every answer now cites its brochure page
            </span>

            <h1 className="mt-7 font-display text-[2.6rem] sm:text-6xl lg:text-[4.2rem] font-bold tracking-[-0.04em] leading-[1.02] text-slate-900">
              Every spec,
              <br />
              every trim,
              <br />
              <span className={`marker ${reduced ? "" : "marker-sweep"}`}>one question</span> away.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-500 leading-relaxed max-w-lg">
              BrochureIQ reads the official brochures for the cars on your
              shortlist, answers in plain language, and shows you the exact page
              it found the answer on.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to={startLink} className={`${PRIMARY_BUTTON} px-5 py-3 text-sm rounded-xl shadow-lg shadow-indigo-600/25`}>
                {startLabel}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="inline-flex items-center px-5 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  I have an account
                </Link>
              )}
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <Files className="w-4 h-4 text-indigo-500" />
                Up to {MAX_PDFS} brochures per chat
              </li>
              <li className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-indigo-500" />
                Page-cited answers
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Free to start
              </li>
            </ul>
          </div>

          <div className="animate-[popIn_0.6s_0.15s_ease-out_both]">
            <HeroDemo />
          </div>
        </section>

        <QuestionTicker />
        <CompareShowcase />
        <SpecSheet />
        <HowItWorks />

        <section className="px-4 sm:px-6 pb-20 sm:pb-28">
          <Reveal className="relative isolate overflow-hidden max-w-6xl mx-auto px-6 py-16 sm:px-12 sm:py-24 rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-indigo-700 text-center shadow-2xl shadow-indigo-600/25">
            <div className="cta-grid absolute inset-0 -z-10" aria-hidden="true" />
            <div className="hidden sm:block" aria-hidden="true">
              <span className="cta-chip left-[7%] top-[18%]" style={{ "--r": "-8deg" }}>p. 14</span>
              <span className="cta-chip right-[8%] top-[24%]" style={{ "--r": "6deg", animationDelay: "-2s" }}>pp. 9, 18</span>
              <span className="cta-chip left-[12%] bottom-[16%]" style={{ "--r": "5deg", animationDelay: "-4s" }}>p. 31</span>
              <span className="cta-chip right-[13%] bottom-[14%]" style={{ "--r": "-5deg", animationDelay: "-1s" }}>p. 22</span>
            </div>

            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.04em] leading-[1.05] text-white">
              Your shortlist deserves
              <br />
              better than Ctrl+F.
            </h2>
            <p className="mt-5 text-base text-white opacity-80 max-w-md mx-auto leading-relaxed">
              Stop flipping through 60-page PDFs. Ask BrochureIQ, and check the page it points you to.
            </p>
            <Link
              to={startLink}
              className="group mt-9 inline-flex items-center gap-2 px-6 py-3.5 bg-white text-indigo-700 text-sm font-semibold rounded-xl shadow-lg hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {user ? "Open BrochureIQ" : "Create your free account"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-6 text-xs text-slate-400">
          <div className="max-w-sm">
            <span className="flex items-center gap-2 text-sm text-slate-700">
              <Logo className="w-6 h-6" />
              <Wordmark />
            </span>
            <p className="mt-3 leading-relaxed">
              Answers are generated from the brochures you provide. Always confirm with the dealer.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            {NAV.map(({ id, label }) => (
              <a key={id} href={`#${id}`} onClick={(e) => scrollTo(e, id)} className="hover:text-indigo-600">
                {label}
              </a>
            ))}
            {!user && (
              <Link to="/login" className="hover:text-indigo-600">
                Log in
              </Link>
            )}
          </nav>
        </div>
        <p className="footer-wordmark font-display" aria-hidden="true">
          BrochureIQ
        </p>
      </footer>
    </div>
  );
}
