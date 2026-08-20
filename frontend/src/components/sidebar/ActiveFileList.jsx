import React from "react";
import { FileText, X } from "lucide-react";
import { MAX_PDFS } from "../../constants/config";

export function ActiveFileList({
  uploadedFiles,
  hasActivePdfs,
  activePdfCount,
  onRemoveFile,
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Active Files
        </span>

        <div className="flex items-center gap-1.5">
          {hasActivePdfs && (
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          )}
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {activePdfCount}/{MAX_PDFS}
          </span>
        </div>
      </div>

      {hasActivePdfs ? (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {uploadedFiles.map((file) => (
            <div
              key={file.name}
              className="group flex items-center gap-2.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center bg-red-50 text-red-500 rounded-md">
                <FileText className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-medium text-slate-700 truncate"
                  title={file.name}
                >
                  {file.name}
                </div>
              </div>

              <button
                onClick={() => onRemoveFile(file.name)}
                className="w-5 h-5 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">No files active</p>
      )}
    </div>
  );
}
