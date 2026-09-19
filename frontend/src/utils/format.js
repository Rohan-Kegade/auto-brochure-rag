export const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// The API returns naive UTC timestamps, so mark them as UTC before parsing.
export const formatDate = (iso) =>
  new Date(`${iso}Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (iso) => {
  const date = new Date(`${iso}Z`);
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatDate(iso)}, ${time}`;
};

// "Today", "Yesterday", the weekday within the last week, otherwise the date.
export const formatDay = (iso) => {
  const date = new Date(`${iso}Z`);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return formatDate(iso);
};
