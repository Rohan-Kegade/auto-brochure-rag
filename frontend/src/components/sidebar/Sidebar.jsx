import { Sparkles } from "lucide-react";
import { Logo } from "../common/Logo";
import { FileUploader } from "./FileUploader";
import { ActiveFileList } from "./ActiveFileList";

export function Sidebar({
  selectedFiles,
  uploadedFiles,
  isUploading,
  activePdfCount,
  hasActivePdfs,
  maxPdfsReached,
  maxPdfs,
  onFileChange,
  onUpload,
  onRemoveFile,
}) {
  return (
    <aside className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center gap-2 mb-7">
          <Logo />
          <h1 className="text-xl font-bold text-slate-900">SpecSense</h1>
        </div>

        <FileUploader
          selectedFiles={selectedFiles}
          isUploading={isUploading}
          maxPdfsReached={maxPdfsReached}
          maxPdfs={maxPdfs}
          onFileChange={onFileChange}
          onUpload={onUpload}
        />

        <ActiveFileList
          uploadedFiles={uploadedFiles}
          hasActivePdfs={hasActivePdfs}
          activePdfCount={activePdfCount}
          maxPdfs={maxPdfs}
          onRemoveFile={onRemoveFile}
        />
      </div>

      <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" /> AI Enabled
        </span>
      </div>
    </aside>
  );
}
