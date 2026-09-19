import { useRef } from "react";
import { FileText, Plus, Upload, X } from "lucide-react";

export function BrochureBar({
  selectedFiles,
  uploadedFiles,
  isUploading,
  activePdfCount,
  maxPdfsReached,
  maxPdfs,
  onFileChange,
  onUpload,
  onRemoveFile,
}) {
  const fileInputRef = useRef(null);
  const hasSelection = selectedFiles.length > 0;

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-2.5 flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
        Active PDFs
        <span className="ml-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full normal-case tracking-normal">
          {activePdfCount}/{maxPdfs}
        </span>
      </span>

      {uploadedFiles.length === 0 && !hasSelection && (
        <span className="text-[11px] text-slate-400 italic">No files active</span>
      )}

      {uploadedFiles.map((file) => (
        <span
          key={file.name}
          className="group flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-lg max-w-56"
        >
          <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span
            className="text-xs font-medium text-slate-700 truncate"
            title={file.name}
          >
            {file.name}
          </span>
          <button
            onClick={() => onRemoveFile(file.name)}
            title="Remove"
            className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {selectedFiles.map((file) => (
        <span
          key={file.name}
          className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg max-w-56"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span
            className="text-xs text-indigo-800 truncate"
            title={file.name}
          >
            {file.name}
          </span>
        </span>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        hidden
        disabled={maxPdfsReached || isUploading}
        onChange={(e) => onFileChange(e, fileInputRef)}
      />

      <div className="ml-auto flex items-center gap-2">
        {hasSelection ? (
          <button
            onClick={() => onUpload(fileInputRef)}
            disabled={isUploading}
            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isUploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload {selectedFiles.length}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={maxPdfsReached || isUploading}
            title={
              maxPdfsReached ? `Maximum of ${maxPdfs} brochures reached` : ""
            }
            className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Brochure
          </button>
        )}
      </div>
    </div>
  );
}
