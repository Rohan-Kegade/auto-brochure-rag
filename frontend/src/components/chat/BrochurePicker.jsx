import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Search, Trash2, Upload, X } from "lucide-react";
import { deleteDocumentApi, searchDocumentsApi } from "../../api/api";
import { filterPdfs } from "../../hooks/useChatDocuments";
import { getErrorMessage } from "../../utils/errors";
import { formatBytes, formatDate } from "../../utils/format";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function LibraryTab({ chatId, pendingIds, slotsLeft, onAttach, onLibraryDelete }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [isAttaching, setIsAttaching] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await searchDocumentsApi({ q: query.trim(), chatId, limit: PAGE_SIZE });
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, "Couldn't search the library."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, chatId, reloadKey]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < slotsLeft) next.add(id);
      else toast.warning(`You can add ${slotsLeft} more PDF${slotsLeft === 1 ? "" : "s"} to this chat.`);
      return next;
    });

  const attachSelected = async () => {
    setIsAttaching(true);
    const ok = await onAttach(
      [...selected],
      result.items.filter((d) => selected.has(d.id)),
    );
    setIsAttaching(false);
    if (ok) {
      toast.success(`${selected.size} brochure${selected.size > 1 ? "s" : ""} added to this chat.`);
      setSelected(new Set());
      setReloadKey((k) => k + 1);
    }
  };

  const remove = async (doc) => {
    const message = `Delete "${doc.filename}" from the library? It will be removed from every chat that uses it.`;
    if (!window.confirm(message)) return;
    try {
      await deleteDocumentApi(doc.id);
      onLibraryDelete(doc.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the brochure."));
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your library by filename..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {!isLoading && result.items.length === 0 && (
          <li className="text-sm text-slate-400 italic py-6 text-center">
            {query ? "No brochures match your search." : "Your library is empty. Upload a brochure first."}
          </li>
        )}
        {result.items.map((doc) => {
          const isAttached = doc.attached || pendingIds.includes(doc.id);
          const disabled = isAttached || doc.status !== "ready";
          return (
            <li
              key={doc.id}
              className="group flex items-center gap-3 px-3 py-2 border border-slate-200 rounded-lg"
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.has(doc.id)}
                onChange={() => toggle(doc.id)}
                className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-700 truncate" title={doc.filename}>
                  {doc.filename}
                </div>
                <div className="text-[11px] text-slate-400">
                  {formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}
                  {doc.status !== "ready" && ` · ${doc.status}`}
                </div>
              </div>
              {isAttached && (
                <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                  In this chat
                </span>
              )}
              <button
                onClick={() => remove(doc)}
                title="Delete from library"
                className="p-1 text-slate-300 hover:text-red-500 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {result.total > result.items.length
            ? `Showing ${result.items.length} of ${result.total}. Refine your search to see more.`
            : `${result.total} in library`}
        </span>
        <button
          onClick={attachSelected}
          disabled={selected.size === 0 || isAttaching}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAttaching ? "Adding..." : `Add ${selected.size || ""} to chat`}
        </button>
      </div>
    </div>
  );
}

function UploadTab({ slotsLeft, isUploading, onUpload, onDone }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);

  const pick = (e) => {
    let picked = filterPdfs(Array.from(e.target.files || []));
    if (picked.length > slotsLeft) {
      toast.warning(`Limit reached: you can only add ${slotsLeft} more PDF${slotsLeft === 1 ? "" : "s"}.`);
      picked = picked.slice(0, slotsLeft);
    }
    setFiles(picked);
    e.target.value = "";
  };

  const submit = async () => {
    if (await onUpload(files)) onDone();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={pick} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl py-8 flex flex-col items-center gap-2 text-sm text-slate-500 cursor-pointer disabled:opacity-50"
      >
        <Upload className="w-6 h-6 text-indigo-500" />
        Choose PDFs to upload
        <span className="text-[11px] text-slate-400">
          Brochures you've uploaded before are reused, not processed again.
        </span>
      </button>

      <ul className="mt-3 space-y-1.5 flex-1 min-h-0 overflow-y-auto">
        {files.map((file) => (
          <li key={file.name} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-sm text-indigo-800 truncate flex-1" title={file.name}>
              {file.name}
            </span>
            <span className="text-[11px] text-indigo-400">{formatBytes(file.size)}</span>
          </li>
        ))}
      </ul>

      <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={submit}
          disabled={files.length === 0 || isUploading}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          {isUploading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            `Upload ${files.length || ""}`
          )}
        </button>
      </div>
    </div>
  );
}

export function BrochurePicker({
  chatId,
  pendingIds,
  slotsLeft,
  isUploading,
  onAttach,
  onUpload,
  onLibraryDelete,
  onClose,
}) {
  const [tab, setTab] = useState("library");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !isUploading && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isUploading]);

  const tabClass = (name) =>
    `px-4 py-2 text-sm font-medium border-b-2 cursor-pointer ${
      tab === name
        ? "border-indigo-600 text-indigo-700"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !isUploading && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add brochure"
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-[32rem] max-h-full flex flex-col p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-slate-800">Add brochure</h3>
          <button onClick={onClose} title="Close" className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 mb-4">
          <button className={tabClass("library")} onClick={() => setTab("library")}>
            Search library
          </button>
          <button className={tabClass("upload")} onClick={() => setTab("upload")}>
            Upload new
          </button>
        </div>

        {tab === "library" ? (
          <LibraryTab
            chatId={chatId}
            pendingIds={pendingIds}
            slotsLeft={slotsLeft}
            onAttach={onAttach}
            onLibraryDelete={onLibraryDelete}
          />
        ) : (
          <UploadTab
            slotsLeft={slotsLeft}
            isUploading={isUploading}
            onUpload={onUpload}
            onDone={onClose}
          />
        )}
      </div>
    </div>
  );
}
