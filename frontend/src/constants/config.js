export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const MAX_PDFS = 5;
export const MAX_FILE_SIZE_MB = 20;
export const DEFAULT_CHAT_TITLE = "New chat";
export const MAX_TITLE_LENGTH = 40;
export const INITIAL_AI_MESSAGE = {
  id: "welcome",
  sender: "ai",
  text: "Hello! Add one or more car brochures to get started.",
};
