export const getOrCreateSessionId = () => {
  let id = localStorage.getItem("session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("session_id", id);
  }
  return id;
};

export const createNewSessionId = () => {
  const newId = crypto.randomUUID();
  localStorage.setItem("session_id", newId);
  return newId;
};
