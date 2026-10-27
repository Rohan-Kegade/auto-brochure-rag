import { API_BASE_URL } from "../constants/config";

// Shared HTTP plumbing: the session token, `apiRequest` (JSON calls with
// retries and friendly errors) and `openStream` (streamed answers).
// Endpoint wrappers live next to this file, one per resource: auth.js,
// chats.js, documents.js.

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

/**
 * POST `body` and return the raw Response so the caller can read its body as a
 * stream. Throws (like apiRequest) when the server rejects the request.
 * Aborting `signal` cancels the request, or the body once it is streaming.
 */
export const openStream = async (path, body, signal) => {
  if (isOffline()) {
    throw new Error(
      "You appear to be offline. Check your connection and try again.",
    );
  }

  const request = jsonRequest("POST", body);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...request,
    headers: withAuth(request.headers),
    signal,
  });
  if (!response.ok) {
    const data = await parseJson(response);
    if (response.status === 401) onUnauthorized();
    throw new Error(errorDetail(data, "Unable to get a response."));
  }
  return response;
};
