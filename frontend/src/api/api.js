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

/**
 * Send a message and stream the answer. `onToken(text)` is called for each
 * chunk; resolves with the saved messages and title once the answer is done.
 * Not retried: a retry would run the model twice.
 */
export const streamMessageApi = async (chatId, message, { onToken } = {}) => {
  if (isOffline()) {
    throw new Error(
      "You appear to be offline. Check your connection and try again.",
    );
  }

  const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/stream`, {
    ...jsonRequest("POST", { message }),
  });
  if (!response.ok) {
    const data = await parseJson(response);
    throw new Error(data.detail || "Unable to get a response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  const handle = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "token") onToken?.(event.text);
    else if (event.type === "done") result = event;
    else if (event.type === "error") {
      throw new Error(event.detail || "Unable to get a response.");
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(handle);
  }
  handle(buffer);

  if (!result) throw new Error("The response was interrupted. Please try again.");
  return result;
};

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
