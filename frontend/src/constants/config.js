export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const MAX_PDFS = 5;
export const MAX_FILE_SIZE_MB = 20;
export const DEFAULT_CHAT_TITLE = "New chat";
export const MAX_TITLE_LENGTH = 40;
export const SINGLE_CAR_SUGGESTIONS = [
  "Give me a quick summary of this car",
  "What are the key safety features?",
  "What are the engine and transmission options?",
  "Which variant offers the best value?",
];

export const MULTI_CAR_SUGGESTIONS = [
  "Compare these cars on price and features",
  "Which one is safer?",
  "Compare mileage and engine specs",
  "Which car is best for a family?",
];
