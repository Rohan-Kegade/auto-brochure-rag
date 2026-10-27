import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

/** "Select all" checkbox, selected count and a bulk delete button, above a settings list. */
export function SelectionBar({ total, selectedCount, onToggleAll, onDelete }) {
  const allRef = useRef(null);
  const all = total > 0 && selectedCount === total;

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selectedCount > 0 && !all;
  }, [selectedCount, all]);

  if (total === 0) return null;

  return (
    <div className="mt-4 h-9 flex items-center justify-between gap-3 px-3">
      <label className="flex items-center gap-3 text-xs font-medium text-slate-500 cursor-pointer select-none">
        <input
          ref={allRef}
          type="checkbox"
          checked={all}
          onChange={onToggleAll}
          aria-label="Select all"
          className="w-4 h-4 accent-indigo-600 cursor-pointer"
        />
        {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
      </label>
      {selectedCount > 0 && (
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete selected
        </button>
      )}
    </div>
  );
}
