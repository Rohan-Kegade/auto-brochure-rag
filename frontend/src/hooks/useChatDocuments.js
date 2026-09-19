import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_FILE_SIZE_MB, MAX_PDFS } from "../constants/config";
import {
  attachDocumentsApi,
  detachDocumentApi,
  fetchChatDocumentsApi,
  uploadDocumentsApi,
} from "../api/api";
import { getErrorMessage } from "../utils/errors";

const isPdf = (file) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

/**
 * Documents attached to one chat, plus the actions that change them.
 *
 * With no `chatId` (a draft chat) documents are only held locally as `draft`;
 * `commitDraft` attaches them once the chat is actually created.
 */
export function useChatDocuments(chatId) {
  const [loaded, setLoaded] = useState({ chatId: null, documents: [] });
  const [draft, setDraft] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const justCommittedRef = useRef(null);

  // Ignore results that belong to a chat we've since navigated away from.
  const documents = chatId
    ? loaded.chatId === chatId
      ? loaded.documents
      : []
    : draft;
  const setDocuments = useCallback(
    (docs) => (chatId ? setLoaded({ chatId, documents: docs }) : setDraft(docs)),
    [chatId],
  );

  useEffect(() => {
    if (!chatId) return;
    // Documents for a chat we just created are already in state; refetching
    // could race the commit and overwrite them.
    if (justCommittedRef.current === chatId) {
      justCommittedRef.current = null;
      return;
    }
    let cancelled = false;
    fetchChatDocumentsApi(chatId)
      .then((docs) => {
        if (!cancelled) setLoaded({ chatId, documents: docs });
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(getErrorMessage(err, "Couldn't load the brochures."), {
            id: "docs-load-error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const attach = async (documentIds, docs = []) => {
    if (!chatId) {
      setDraft((prev) => [...prev, ...docs.filter((d) => !prev.some((p) => p.id === d.id))]);
      return true;
    }
    try {
      setDocuments(await attachDocumentsApi(chatId, documentIds));
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add the brochure."));
      return false;
    }
  };

  const detach = async (doc) => {
    if (!chatId) {
      setDraft((prev) => prev.filter((d) => d.id !== doc.id));
      return;
    }
    try {
      await detachDocumentApi(chatId, doc.id);
      setDocuments(documents.filter((d) => d.id !== doc.id));
    } catch (err) {
      toast.error(getErrorMessage(err, `Couldn't remove ${doc.filename}.`));
    }
  };

  /** Upload new PDFs into the library and attach them to this chat. */
  const upload = async (files) => {
    setIsUploading(true);
    try {
      const { results } = await uploadDocumentsApi(files, chatId);
      const added = results.filter((r) =>
        chatId ? r.document?.attached : r.document?.status === "ready",
      );
      results
        .filter((r) => r.error)
        .forEach((r) => toast.warning(`${r.filename}: ${r.error}`));
      if (added.length > 0) {
        toast.success(
          `${added.length} brochure${added.length > 1 ? "s" : ""} added to this chat.`,
        );
        if (chatId) {
          setDocuments(await fetchChatDocumentsApi(chatId));
        } else {
          setDraft((prev) => [
            ...prev,
            ...added
              .map((r) => r.document)
              .filter((d) => !prev.some((p) => p.id === d.id)),
          ]);
        }
      }
      return added.length > 0;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload brochure."));
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  /** Attach the draft's documents to the chat that was just created for them. */
  const commitDraft = async (newChatId) => {
    if (draft.length === 0) return;
    const attached = await attachDocumentsApi(
      newChatId,
      draft.map((d) => d.id),
    );
    justCommittedRef.current = newChatId;
    setLoaded({ chatId: newChatId, documents: attached });
    setDraft([]);
  };

  /** Drop a document that was deleted from the library from the attached list. */
  const forget = (documentId) =>
    setDocuments(documents.filter((d) => d.id !== documentId));

  return {
    documents,
    isUploading,
    activePdfCount: documents.length,
    hasActivePdfs: documents.length > 0,
    maxPdfs: MAX_PDFS,
    maxPdfsReached: documents.length >= MAX_PDFS,
    attach,
    detach,
    upload,
    forget,
    commitDraft,
  };
}

/** Keep only valid PDFs within the size limit, toasting about the rest. */
export function filterPdfs(files) {
  const pdfs = files.filter(isPdf);
  if (pdfs.length !== files.length) toast.error("Only PDF files are supported.");
  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  const sized = pdfs.filter((f) => f.size <= maxBytes);
  if (sized.length !== pdfs.length) {
    toast.error(`Each PDF must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
  }
  return sized;
}
