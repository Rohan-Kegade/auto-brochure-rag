import { apiRequest, jsonRequest } from "./client";

// Brochures attached to one chat.

export const fetchChatDocumentsApi = (chatId) =>
  apiRequest(`/chats/${chatId}/documents`, {
    retry: true,
    fallbackError: "Couldn't load the brochures for this chat.",
  });

export const attachDocumentsApi = (chatId, documentIds) =>
  apiRequest(`/chats/${chatId}/documents`, {
    ...jsonRequest("POST", { document_ids: documentIds }),
    fallbackError: "Couldn't add the brochure to this chat.",
  });

export const detachDocumentApi = (chatId, documentId) =>
  apiRequest(`/chats/${chatId}/documents/${documentId}`, {
    method: "DELETE",
    fallbackError: "Couldn't remove the brochure.",
  });

// The user's whole brochure library.

export const searchDocumentsApi = ({ q, chatId, limit = 20, offset = 0 }) => {
  const params = new URLSearchParams({ limit, offset });
  if (q) params.set("q", q);
  if (chatId) params.set("chat_id", chatId);
  return apiRequest(`/documents?${params}`, {
    retry: true,
    fallbackError: "Couldn't search the library.",
  });
};

export const uploadDocumentsApi = (files, chatId) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const query = chatId ? `?chat_id=${chatId}` : "";
  return apiRequest(`/documents${query}`, {
    method: "POST",
    body: formData,
    fallbackError: "Unable to add the brochures.",
  });
};

export const deleteDocumentApi = (documentId) =>
  apiRequest(`/documents/${documentId}`, {
    method: "DELETE",
    fallbackError: "Couldn't delete the brochure.",
  });
