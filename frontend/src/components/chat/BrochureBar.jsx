import { useState } from "react";
import { FileText, Plus, X } from "lucide-react";
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
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-2.5 flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
        Active PDFs
        <span className="ml-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full normal-case tracking-normal">
          {activePdfCount}/{maxPdfs}
        </span>
      </span>

      {documents.length === 0 && (
        <span className="text-[11px] text-slate-400 italic">No files active</span>
      )}

      {documents.map((doc) => (
        <span
          key={doc.id}
          className="group flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-lg max-w-56"
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

      <div className="ml-auto">
        <button
          onClick={() => setPickerOpen(true)}
          disabled={!chatId || maxPdfsReached}
          title={maxPdfsReached ? `Maximum of ${maxPdfs} brochures reached` : ""}
          className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Brochure
        </button>
      </div>

      {pickerOpen && (
        <BrochurePicker
          chatId={chatId}
          slotsLeft={maxPdfs - activePdfCount}
          isUploading={isUploading}
          onAttach={onAttach}
          onUpload={onUpload}
          onLibraryDelete={onLibraryDelete}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
