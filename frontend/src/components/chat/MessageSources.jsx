import { FileText } from "lucide-react";

const brochureName = (filename) => filename.replace(/\.pdf$/i, "");

/** The brochures an answer cites, each with the pages it cites from it. */
export function MessageSources({ sources }) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sources</p>
      <ul className="mt-1.5 space-y-1">
        {sources.map((source) => (
          <li key={source.document_id} className="flex items-start gap-2 text-xs min-w-0">
            <FileText className="w-3.5 h-3.5 mt-px shrink-0 text-indigo-500" />
            <span className="font-medium text-slate-700 truncate" title={source.filename}>
              {brochureName(source.filename)}
            </span>
            {source.pages.length > 0 && (
              <span className="shrink-0 text-slate-500">
                {source.pages.length === 1 ? "p." : "pp."} {source.pages.join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
