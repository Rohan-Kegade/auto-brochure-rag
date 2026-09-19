export function ChatHeader({ title }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center shadow-xs">
      <h2
        className="text-base font-semibold text-slate-800 truncate"
        title={title}
      >
        {title}
      </h2>
    </header>
  );
}
