import { X } from "lucide-react";
import { AddBrochureButton } from "./AddBrochureButton";
import { BrochurePicker } from "./BrochurePicker";
import { BrochureSwatch } from "./BrochureSwatch";

const brochureName = (filename) => filename.replace(/\.pdf$/i, "");

export function BrochureBar({
  chatId,
  documents,
  isLoadingDocuments,
  activePdfCount,
  maxPdfs,
  maxPdfsReached,
  isUploading,
  onAttach,
  onUpload,
  onDetach,
  onLibraryDelete,
  pickerOpen,
  onPickerOpenChange,
}) {
  return (
    <div className="border-b border-slate-200 px-4 sm:px-6 pb-2.5 flex items-center gap-3">
      <CapacityGauge used={activePdfCount} max={maxPdfs} />

      <div
        onWheel={(e) => {
          // No scrollbar, so let a mouse wheel scroll the row sideways.
          if (e.deltaY !== 0 && e.deltaX === 0) e.currentTarget.scrollLeft += e.deltaY;
        }}
        className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {documents.length === 0 && !isLoadingDocuments && (
          <span className="text-[11px] text-slate-400 italic">No brochures yet</span>
        )}

        {documents.map((doc) => (
        <span
          key={doc.id}
          className="group shrink-0 flex items-center gap-2 pl-1.5 pr-1 py-1 bg-white border border-slate-200 rounded-lg shadow-xs max-w-44 sm:max-w-60 animate-[popIn_0.2s_ease-out]"
        >
          <BrochureSwatch id={doc.id} />
          <span
            className="text-xs font-medium text-slate-700 truncate"
            title={doc.filename}
          >
            {brochureName(doc.filename)}
          </span>
          <button
            onClick={() => onDetach(doc)}
            title="Remove from this chat"
            aria-label={`Remove ${doc.filename} from this chat`}
            className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-slate-50 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
        ))}

        <div className="shrink-0">
          <AddBrochureButton
            onClick={() => onPickerOpenChange(true)}
            disabled={maxPdfsReached}
            maxPdfs={maxPdfs}
          />
        </div>
      </div>

      {pickerOpen && (
        <BrochurePicker
          chatId={chatId}
          pendingIds={documents.map((d) => d.id)}
          slotsLeft={maxPdfs - activePdfCount}
          isUploading={isUploading}
          onAttach={onAttach}
          onDetach={onDetach}
          onUpload={onUpload}
          onLibraryDelete={onLibraryDelete}
          onClose={() => onPickerOpenChange(false)}
        />
      )}
    </div>
  );
}

// How many of the chat's brochure slots are used, as a row of bars, like a
// fuel gauge.
function CapacityGauge({ used, max }) {
  const label = `${used} of ${max} brochures in this chat`;
  return (
    <span className="shrink-0 flex items-center gap-2" title={label} aria-label={label} role="img">
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-sm transition-colors duration-300 ${
              i < used ? "bg-indigo-500" : "bg-slate-200"
            }`}
            style={{ height: `${8 + i * 2}px` }}
          />
        ))}
      </span>
      <span className="text-[11px] font-medium text-slate-500 tabular-nums" aria-hidden="true">
        {used}/{max}
      </span>
    </span>
  );
}
