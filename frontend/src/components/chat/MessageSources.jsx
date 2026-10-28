import { BrochureSwatch } from "./BrochureSwatch";

const brochureName = (filename) => filename.replace(/\.pdf$/i, "");

/** The brochures an answer cites, each with the pages it cites from it. */
export function MessageSources({ sources }) {
  return (
    <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sources</p>
      <ul className="mt-2 space-y-1.5">
        {sources.map((source) => (
          <li key={source.document_id} className="flex items-start gap-2 text-xs min-w-0">
            <BrochureSwatch id={source.document_id} className="w-3 h-4 mt-px" />
            <span className="font-medium text-slate-700 truncate" title={source.filename}>
              {brochureName(source.filename)}
            </span>
            {source.pages.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {source.pages.map((page) => (
                  <span key={page} className="page-tag" title={`Page ${page}`}>
                    p. {page}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
