const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
};

export const getOrCreateSessionId = () => {
  let id = localStorage.getItem("session_id");
  if (!id) {
    id = generateId();
    localStorage.setItem("session_id", id);
  }
  return id;
};

export const createNewSessionId = () => {
  const newId = generateId();
  localStorage.setItem("session_id", newId);
  return newId;
};
