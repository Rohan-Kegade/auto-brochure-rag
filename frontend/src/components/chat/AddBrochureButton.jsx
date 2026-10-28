import { Plus } from "lucide-react";

export function AddBrochureButton({ onClick, disabled, maxPdfs }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `Maximum of ${maxPdfs} brochures reached` : ""}
      className="group py-1.5 pl-2 pr-3 bg-transparent border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-indigo-300 flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <Plus className="w-3.5 h-3.5 transition-transform group-enabled:group-hover:rotate-90" />
      Add brochure
    </button>
  );
}
