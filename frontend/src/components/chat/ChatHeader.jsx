import React from "react";
import { RotateCcw } from "lucide-react";

export function ChatHeader({ onOpenRestartModal }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shadow-xs">
      <h2 className="text-base font-semibold text-slate-800">Chat Assistant</h2>
      <button
        onClick={onOpenRestartModal}
        title="Start New Session"
        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Restart</span>
      </button>
    </header>
  );
}
