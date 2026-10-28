import { createContext, useContext, useState } from "react";

// One colour per brochure, used on its chip, cover and citations so a reader
// can tell at a glance which brochure an answer came from.
export const TONES = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#6366f1"],
  ["#d946ef", "#8b5cf6"],
  ["#10b981", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
];

/** Maps a chat's brochure ids to their slot, in the order they were added. */
export const BrochureTonesContext = createContext(new Map());

// Brochures keep their slot while attached; a new one takes the lowest free slot.
const assignSlots = (prev, documents) => {
  const next = new Map();
  for (const d of documents) if (prev.has(d.id)) next.set(d.id, prev.get(d.id));
  for (const d of documents) {
    if (next.has(d.id)) continue;
    const used = new Set(next.values());
    let slot = 0;
    while (used.has(slot)) slot += 1;
    next.set(d.id, slot);
  }
  return next;
};

/** Stable tone slots for the open chat's brochures, for BrochureTonesContext. */
export function useToneSlots(documents) {
  // Compared by ids: `documents` can be a fresh array on every render.
  const key = documents.map((d) => d.id).join(",");
  const [state, setState] = useState(() => ({ key, slots: assignSlots(new Map(), documents) }));
  if (state.key !== key) {
    const slots = assignSlots(state.slots, documents);
    setState({ key, slots });
    return slots;
  }
  return state.slots;
}

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The [from, to] colours of a brochure. Brochures no longer attached fall back to a hash. */
export function useBrochureTone(id) {
  const slots = useContext(BrochureTonesContext);
  const slot = slots.get(id) ?? hash(String(id));
  return TONES[slot % TONES.length];
}

export const toneGradient = ([from, to]) => `linear-gradient(135deg, ${from}, ${to})`;
