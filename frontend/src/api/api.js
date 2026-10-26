import { API_BASE_URL } from "../constants/config";

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

// --- session token ---
// Sent as a Bearer token on every request. Kept in localStorage so a login
// survives reloads; the backend can revoke it (logout, expiry).

const TOKEN_KEY = "authToken";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage the login just lasts until the page is reloaded.
  }
};

let onUnauthorized = () => {};

/** Called when the server rejects the session (expired or logged out elsewhere). */
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const withAuth = (headers = {}) => {
  const token = getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

// FastAPI validation errors put a list of problems in `detail`.
const errorDetail = (data, fallback) => {
  if (Array.isArray(data.detail)) return data.detail[0]?.msg || fallback;
  return data.detail || fallback;
};

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const apiRequest = async (
  path,
  {
    retry = false,
    // false for login/signup: a 401 there means wrong credentials, not an
    // expired session.
    auth = true,
    fallbackError = "Something went wrong.",
    ...options
  } = {},
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
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: auth ? withAuth(options.headers) : options.headers,
      });
    } catch (err) {
      lastError = err;
      continue;
    }

    if (response.ok) return parseJson(response);

    const data = await parseJson(response);
    const error = new Error(errorDetail(data, fallbackError));
    if (auth && response.status === 401) onUnauthorized();
    if (response.status === 429 || response.status >= 500) {
      lastError = error;
      continue;
    }
    throw error;
  }

  throw lastError;
};

export const jsonRequest = (method, body) => ({
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
 * POST to a streaming answer endpoint. `onToken(text)` is called for each chunk;
 * resolves with the saved messages and title once the answer is done.
 * Not retried: a retry would run the model twice.
 *
 * Errors carry `questionSaved`: once the server accepts the request the
 * question is saved, so a later failure leaves it in the chat to retry.
 */
const streamAnswer = async (path, body, { onToken } = {}) => {
  if (isOffline()) {
    throw new Error(
      "You appear to be offline. Check your connection and try again.",
    );
  }

  const request = jsonRequest("POST", body);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...request,
    headers: withAuth(request.headers),
  });
  if (!response.ok) {
    const data = await parseJson(response);
    if (response.status === 401) onUnauthorized();
    throw new Error(errorDetail(data, "Unable to get a response."));
  }

  const fail = (message) => Object.assign(new Error(message), { questionSaved: true });
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
      throw fail(event.detail || "Unable to get a response.");
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      lines.forEach(handle);
    }
    handle(buffer);
  } catch (err) {
    throw err.questionSaved ? err : fail(err.message);
  }

  if (!result) throw fail("The response was interrupted. Please try again.");
  return result;
};

/** Send a message and stream its answer. */
export const streamMessageApi = (chatId, message, options) =>
  streamAnswer(`/chats/${chatId}/messages/stream`, { message }, options);

/** Answer the chat's latest question again after its answer failed. */
export const retryMessageApi = (chatId, options) =>
  streamAnswer(`/chats/${chatId}/messages/retry/stream`, {}, options);

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
