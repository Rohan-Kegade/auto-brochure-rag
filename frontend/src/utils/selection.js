/** A copy of `set` with `id` added, or removed if it was there. */
export const toggleId = (set, id) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};
