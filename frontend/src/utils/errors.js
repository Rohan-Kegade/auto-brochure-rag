export const getErrorMessage = (err, fallback = "Something went wrong.") => {
  if (err instanceof TypeError || err?.message === "Failed to fetch") {
    return "Can't reach the server. Check that the backend is running and try again.";
  }
  return err?.message || fallback;
};
