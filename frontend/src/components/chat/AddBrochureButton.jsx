import { FileText } from "lucide-react";

export function AddBrochureButton({ onClick, disabled, maxPdfs }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `Maximum of ${maxPdfs} brochures reached` : ""}
      className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
    >
      <FileText className="w-3.5 h-3.5" />
      Add Brochure
    </button>
  );
}
