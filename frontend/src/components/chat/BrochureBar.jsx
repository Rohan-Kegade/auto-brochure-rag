import { FileText, X } from "lucide-react";
import { AddBrochureButton } from "./AddBrochureButton";
import { BrochurePicker } from "./BrochurePicker";

export function BrochureBar({
  chatId,
  documents,
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
    <div className="border-b border-slate-200 bg-white px-6 py-2.5 flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
        Active PDFs
        <span className="ml-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full normal-case tracking-normal">
          {activePdfCount}/{maxPdfs}
        </span>
      </span>

      <div
        onWheel={(e) => {
          // No scrollbar, so let a mouse wheel scroll the row sideways.
          if (e.deltaY !== 0 && e.deltaX === 0) e.currentTarget.scrollLeft += e.deltaY;
        }}
        className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {documents.length === 0 && (
          <span className="text-[11px] text-slate-400 italic">No files active</span>
        )}

        {documents.map((doc) => (
        <span
          key={doc.id}
          className="group shrink-0 flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-lg max-w-56"
        >
          <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span
            className="text-xs font-medium text-slate-700 truncate"
            title={doc.filename}
          >
            {doc.filename}
          </span>
          <button
            onClick={() => onDetach(doc)}
            title="Remove from this chat"
            className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 cursor-pointer"
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
