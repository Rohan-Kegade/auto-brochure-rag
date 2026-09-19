import { API_BASE_URL } from "../constants/config";

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const apiRequest = async (
  path,
  { retry = false, fallbackError = "Something went wrong.", ...options } = {},
) => {
  if (isOffline()) {
    throw new Error(
      "You appear to be offline. Check your connection and try again.",
    );
  }

  const attempts = retry ? MAX_RETRIES + 1 : 1;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, options);
    } catch (err) {
      lastError = err;
      continue;
    }

    if (response.ok) return parseJson(response);

    const data = await parseJson(response);
    const error = new Error(data.detail || fallbackError);
    if (response.status === 429 || response.status >= 500) {
      lastError = error;
      continue;
    }
    throw error;
  }

  throw lastError;
};

const jsonRequest = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// --- chats ---

export const fetchChatsApi = () =>
  apiRequest("/chats", { retry: true, fallbackError: "Couldn't load your chats." });

export const createChatApi = () =>
  apiRequest("/chats", {
    ...jsonRequest("POST", {}),
    fallbackError: "Couldn't create a new chat.",
  });

export const renameChatApi = (chatId, title) =>
  apiRequest(`/chats/${chatId}`, {
    ...jsonRequest("PATCH", { title }),
    fallbackError: "Couldn't rename the chat.",
  });

export const deleteChatApi = (chatId) =>
  apiRequest(`/chats/${chatId}`, {
    method: "DELETE",
    fallbackError: "Couldn't delete the chat.",
  });

export const fetchMessagesApi = (chatId) =>
  apiRequest(`/chats/${chatId}/messages`, {
    retry: true,
    fallbackError: "Couldn't load the messages.",
  });

// Not retried: a retry would run the model twice.
export const sendMessageApi = (chatId, message) =>
  apiRequest(`/chats/${chatId}/messages`, {
    ...jsonRequest("POST", { message }),
    fallbackError: "Unable to get a response.",
  });

// --- documents attached to a chat ---

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

// --- document library ---

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
