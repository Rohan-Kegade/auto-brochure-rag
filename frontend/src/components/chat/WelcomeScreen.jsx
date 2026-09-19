import { MessageSquarePlus } from "lucide-react";
import { AddBrochureButton } from "./AddBrochureButton";
import { Logo } from "../common/Logo";
import {
  MULTI_CAR_SUGGESTIONS,
  SINGLE_CAR_SUGGESTIONS,
} from "../../constants/config";

export function WelcomeScreen({
  activePdfCount,
  maxPdfs,
  maxPdfsReached,
  onAddBrochure,
  onPickSuggestion,
}) {
  const hasPdfs = activePdfCount > 0;
  const suggestions =
    activePdfCount > 1 ? MULTI_CAR_SUGGESTIONS : SINGLE_CAR_SUGGESTIONS;

  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <Logo className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Hello, welcome to SpecSense</h2>

        {hasPdfs ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              {activePdfCount === 1
                ? "Your brochure is ready. Ask anything about it, or try one of these:"
                : `${activePdfCount} brochures are ready. Ask about any of them, compare them, or try one of these:`}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 text-left">
              {suggestions.map((text) => (
                <button
                  key={text}
                  onClick={() => onPickSuggestion(text)}
                  className="flex items-start gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <MessageSquarePlus className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                  {text}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-500">
              Add a car brochure to this chat to get started, then ask about
              specs, features or compare cars.
            </p>
            <div className="mt-5 flex justify-center">
              <AddBrochureButton
                onClick={onAddBrochure}
                disabled={maxPdfsReached}
                maxPdfs={maxPdfs}
              />
            </div>
            <p className="mt-6 text-xs text-slate-400">
              Add one brochure to explore a single car, or several to compare them.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
