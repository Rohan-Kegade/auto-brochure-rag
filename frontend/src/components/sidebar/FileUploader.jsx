import React, { useRef } from "react";
import { Upload, CheckCircle2, FileText } from "lucide-react";

export function FileUploader({
  selectedFiles,
  isUploading,
  maxPdfsReached,
  maxPdfs,
  onFileChange,
  onUpload,
}) {
  const fileInputRef = useRef(null);

  return (
    <div>
      <div className="mb-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Car Brochures
        </label>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        disabled={maxPdfsReached || isUploading}
        onChange={(e) => onFileChange(e, fileInputRef)}
        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {!maxPdfsReached && (
        <p className="mt-2 text-[11px] text-slate-400">
          Add up to {maxPdfs} brochures
        </p>
      )}

      {maxPdfsReached && (
        <p className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Maximum of {maxPdfs} brochures reached
        </p>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {selectedFiles.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-2 px-2.5 py-2 bg-indigo-50 border border-indigo-100 rounded-lg"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span
                className="text-xs text-indigo-800 truncate"
                title={file.name}
              >
                {file.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onUpload(fileInputRef)}
        disabled={isUploading || selectedFiles.length === 0 || maxPdfsReached}
        className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        {isUploading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Add Brochures
          </>
        )}
      </button>
    </div>
  );
}
