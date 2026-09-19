import { formatDate } from "../../utils/format";

export function ChatHeader({ title, createdAt }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex flex-col justify-center shadow-xs">
      <h2
        className="text-base font-semibold text-slate-800 truncate"
        title={title}
      >
        {title}
      </h2>
      {createdAt && (
        <p className="text-xs text-slate-400">Created {formatDate(createdAt)}</p>
      )}
    </header>
  );
}
