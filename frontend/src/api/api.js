import { API_BASE_URL } from "../constants/config";

export const fetchActiveFiles = async (sessionId) => {
  const response = await fetch(`${API_BASE_URL}/files`, {
    headers: { "X-Session-ID": sessionId },
  });
  if (!response.ok) throw new Error("Failed to sync active session files.");
  return response.json();
};

export const uploadFilesApi = async (sessionId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: { "X-Session-ID": sessionId },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok)
    throw new Error(data.detail || "Unable to add the brochures.");
  return data;
};

export const sendChatMessageApi = async (sessionId, message, history) => {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
    body: JSON.stringify({ message, history }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to get a response.");
  return data;
};
