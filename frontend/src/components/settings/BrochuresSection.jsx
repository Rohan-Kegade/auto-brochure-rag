import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Search, Trash2, Upload } from "lucide-react";
import { deleteDocumentApi, searchDocumentsApi, uploadDocumentsApi } from "../../api/documents";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { MAX_PDFS } from "../../constants/config";
import { getErrorMessage } from "../../utils/errors";
import { filterPdfs } from "../../utils/files";
import { formatBytes, formatDate } from "../../utils/format";
import { SettingsSection } from "./SettingsSection";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function BrochuresSection({ onDocumentDeleted }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await searchDocumentsApi({ q: query.trim(), limit: PAGE_SIZE });
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, "Couldn't load your brochures."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, reloadKey]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const data = await searchDocumentsApi({
        q: query.trim(),
        limit: PAGE_SIZE,
        offset: result.items.length,
      });
      setResult((prev) => ({
        items: [...prev.items, ...data.items.filter((d) => !prev.items.some((p) => p.id === d.id))],
        total: data.total,
      }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't load more brochures."));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const upload = async (e) => {
    let files = filterPdfs(Array.from(e.target.files || []));
    e.target.value = "";
    if (files.length > MAX_PDFS) {
      toast.warning(`You can upload up to ${MAX_PDFS} PDFs at a time; uploading the first ${MAX_PDFS}.`);
      files = files.slice(0, MAX_PDFS);
    }
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const { results } = await uploadDocumentsApi(files);
      results
        .filter((r) => r.error)
        .forEach((r) => toast.warning(`${r.filename}: ${r.error}`));
      const created = results.filter((r) => r.outcome === "created").length;
      const existing = results.filter((r) => r.outcome === "existing").length;
      if (created > 0) {
        toast.success(`${created} brochure${created > 1 ? "s" : ""} added to your library.`);
      }
      if (existing > 0) {
        toast.info(`${existing} brochure${existing > 1 ? "s were" : " was"} already in your library.`);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload brochures."));
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (doc) => {
    try {
      await deleteDocumentApi(doc.id);
      setResult((prev) => ({
        items: prev.items.filter((d) => d.id !== doc.id),
        total: Math.max(0, prev.total - 1),
      }));
      onDocumentDeleted(doc.id);
      toast.success(`${doc.filename} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the brochure."));
    }
  };

  return (
    <SettingsSection
      title="My brochures"
      description="Every PDF you've uploaded. Deleting one also removes it from the chats that use it."
    >
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={upload} />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename..."
            aria-label="Search brochures"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? "Processing…" : "Upload PDFs"}
        </button>
      </div>

      <ul className="mt-4 space-y-1.5">
        {isLoading && (
          <li className="py-6 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </li>
        )}
        {!isLoading && result.items.length === 0 && (
          <li className="text-sm text-slate-400 italic py-6 text-center">
            {query ? "No brochures match your search." : "You haven't uploaded any brochures yet."}
          </li>
        )}
        {!isLoading &&
          result.items.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-lg"
            >
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-700 truncate" title={doc.filename}>
                  {doc.filename}
                </div>
                <div className="text-[11px] text-slate-400">
                  {formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}
                </div>
              </div>
              <button
                onClick={() => setPendingDelete(doc)}
                title="Delete brochure"
                aria-label={`Delete ${doc.filename}`}
                className="p-2 -mr-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
      </ul>

      {!isLoading && result.items.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Showing {result.items.length} of {result.total}
          </span>
          {result.items.length < result.total && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-60 cursor-pointer"
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this brochure?"
          detail={pendingDelete.filename}
          description="It will be removed from your library and from every chat that uses it. This can't be undone."
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </SettingsSection>
  );
}
