import { ArrowUpRight, Plus } from "lucide-react";
import { toneGradient, useBrochureTone } from "../../hooks/useBrochureTone";
import {
  MULTI_CAR_SUGGESTIONS,
  SINGLE_CAR_SUGGESTIONS,
} from "../../constants/config";

const brochureName = (filename) => filename.replace(/\.pdf$/i, "");

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export function WelcomeScreen({
  userName,
  documents,
  activePdfCount,
  maxPdfs,
  maxPdfsReached,
  onAddBrochure,
  onPickSuggestion,
}) {
  const hasPdfs = activePdfCount > 0;
  const firstName = userName.trim().split(/\s+/)[0];

  return (
    <div className="flex-1 overflow-y-auto flex p-4 sm:p-6">
      <div className="m-auto max-w-2xl w-full">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-indigo-600 animate-[fadeIn_0.4s_ease-out]">
          {greeting()}, {firstName}
        </p>

        {hasPdfs ? (
          <ReadyState
            documents={documents}
            onPickSuggestion={onPickSuggestion}
            onAddBrochure={onAddBrochure}
            canAddMore={!maxPdfsReached}
          />
        ) : (
          <EmptyState maxPdfs={maxPdfs} onAddBrochure={onAddBrochure} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ maxPdfs, onAddBrochure }) {
  return (
    <div className="text-center animate-[popIn_0.3s_ease-out]">
      <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-slate-900 text-balance">
        Which car are we reading about?
      </h2>
      <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        Add the official brochure for one car to explore it, or up to {maxPdfs} to
        compare them side by side.
      </p>

      {/* A blank brochure page; the whole page is the button. */}
      <button
        onClick={onAddBrochure}
        className="empty-page group relative mt-9 mx-auto w-48 aspect-[3/4] flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4"
      >
        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
          <Plus className="w-6 h-6" />
        </span>
        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">Add a brochure</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">PDF</span>
      </button>

      <div className="mt-10">
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Then ask things like</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {SINGLE_CAR_SUGGESTIONS.slice(1).map((text) => (
            <li
              key={text}
              className="px-3 py-1.5 bg-white/70 border border-slate-200 rounded-full text-xs text-slate-500"
            >
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReadyState({ documents, onPickSuggestion, onAddBrochure, canAddMore }) {
  const single = documents.length === 1;
  const suggestions = single ? SINGLE_CAR_SUGGESTIONS : MULTI_CAR_SUGGESTIONS;

  return (
    <div className="animate-[popIn_0.3s_ease-out]">
      <h2 className="mt-3 text-center font-display text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-slate-900 text-balance">
        {single ? (
          <>What do you want to know about <span className="marker">{brochureName(documents[0].filename)}</span>?</>
        ) : (
          <>Ready to compare <span className="marker">{documents.length} brochures</span>.</>
        )}
      </h2>

      <CoverFan documents={documents} />

      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {suggestions.map((text, i) => (
          <button
            key={text}
            onClick={() => onPickSuggestion(text)}
            className="group flex items-start gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-left text-sm text-slate-700 shadow-xs hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-900/5 hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span className="mt-px text-[10px] font-bold text-indigo-500 tabular-nums">Q{i + 1}</span>
            <span className="flex-1">{text}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-300 transition-all group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        ))}
      </div>

      {single && canAddMore && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Weighing it up against another car?{" "}
          <button
            onClick={onAddBrochure}
            className="font-medium text-indigo-600 hover:text-indigo-700 underline decoration-indigo-300 underline-offset-2 cursor-pointer"
          >
            Add its brochure
          </button>
        </p>
      )}
    </div>
  );
}

// The chat's brochures as a small fan of covers.
function CoverFan({ documents }) {
  const n = documents.length;
  return (
    <div className="relative mt-8 h-36 flex justify-center" aria-hidden="true">
      {documents.map((doc, i) => {
        const offset = i - (n - 1) / 2;
        return (
          <Cover
            key={doc.id}
            doc={doc}
            // Position comes from --o in index.css (.fan-cover).
            style={{ "--o": offset, zIndex: n - Math.round(Math.abs(offset) * 2) }}
          />
        );
      })}
    </div>
  );
}

function Cover({ doc, style }) {
  const tone = useBrochureTone(doc.id);
  return (
    <div
      className="fan-cover absolute top-0 w-24 h-32 bg-white border border-slate-200 rounded-lg shadow-lg shadow-indigo-900/10 overflow-hidden"
      style={style}
    >
      <div className="h-[58%] px-2 pt-2 text-white" style={{ backgroundImage: toneGradient(tone) }}>
        <p className="text-[8px] uppercase tracking-[0.2em] opacity-80">Brochure</p>
        <p className="mt-0.5 font-display text-[11px] font-bold leading-tight line-clamp-3 break-words">
          {brochureName(doc.filename)}
        </p>
      </div>
      <div className="p-2 space-y-1">
        <div className="h-1 w-10/12 rounded-full bg-slate-100" />
        <div className="h-1 w-7/12 rounded-full bg-slate-100" />
        <div className="h-1 w-9/12 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
