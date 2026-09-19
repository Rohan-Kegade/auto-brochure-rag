import { useCallback, useEffect, useState } from "react";
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

/** Documents attached to one chat, plus the actions that change them. */
export function useChatDocuments(chatId) {
  const [loaded, setLoaded] = useState({ chatId: null, documents: [] });
  const [isUploading, setIsUploading] = useState(false);

  // Ignore results that belong to a chat we've since navigated away from.
  const documents = loaded.chatId === chatId ? loaded.documents : [];
  const setDocuments = useCallback(
    (docs) => setLoaded({ chatId, documents: docs }),
    [chatId],
  );

  useEffect(() => {
    if (!chatId) return;
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

  const attach = async (documentIds) => {
    try {
      setDocuments(await attachDocumentsApi(chatId, documentIds));
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add the brochure."));
      return false;
    }
  };

  const detach = async (doc) => {
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
      const added = results.filter((r) => r.document?.attached);
      results
        .filter((r) => r.error)
        .forEach((r) => toast.warning(`${r.filename}: ${r.error}`));
      if (added.length > 0) {
        toast.success(
          `${added.length} brochure${added.length > 1 ? "s" : ""} added to this chat.`,
        );
        setDocuments(await fetchChatDocumentsApi(chatId));
      }
      return added.length > 0;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload brochure."));
      return false;
    } finally {
      setIsUploading(false);
    }
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
