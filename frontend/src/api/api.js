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

export const fetchActiveFiles = () =>
  apiRequest("/files", {
    retry: true,
    fallbackError: "Failed to sync active files.",
  });

export const uploadFilesApi = (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return apiRequest("/upload", {
    method: "POST",
    body: formData,
    fallbackError: "Unable to add the brochures.",
  });
};

export const sendChatMessageApi = (message, history) =>
  apiRequest("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, history }),
    retry: true,
    fallbackError: "Unable to get a response.",
  });

export const deleteFileApi = (fileName) =>
  apiRequest(`/files/${encodeURIComponent(fileName)}`, {
    method: "DELETE",
    fallbackError: "Failed to remove file",
  });
