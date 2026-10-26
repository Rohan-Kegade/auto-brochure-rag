import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";

const MENU_WIDTH = 144;
const MENU_HEIGHT = 84;

// Touch screens have no hover, so a chat's actions live behind a ⋮ menu there.
// Portalled with fixed positioning so the scrolling chat list (and the drawer's
// transform) can't clip it.
export function ChatRowMenu({ onRename, onDelete }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  const toggle = () => {
    if (position) return setPosition(null);
    const rect = buttonRef.current.getBoundingClientRect();
    // Open upwards when there isn't room below.
    const top =
      rect.bottom + MENU_HEIGHT > window.innerHeight ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4;
    setPosition({ top, left: Math.max(8, rect.right - MENU_WIDTH) });
  };

  useEffect(() => {
    if (!position) return;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setPosition(null);
    };
    const onKey = (e) => e.key === "Escape" && setPosition(null);
    const onScroll = () => setPosition(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    // Capture phase, so scrolling the chat list closes it too.
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [position]);

  const choose = (action) => () => {
    setPosition(null);
    action();
  };

  const itemClass =
    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-slate-50 cursor-pointer";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        title="Chat options"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        className="hidden pointer-coarse:block p-2 mr-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
      >
        <EllipsisVertical className="w-4 h-4" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-50 py-1 bg-white border border-slate-200 rounded-xl shadow-lg animate-[popIn_120ms_ease-out]"
          >
            <button role="menuitem" onClick={choose(onRename)} className={`${itemClass} text-slate-700`}>
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              Rename
            </button>
            <button role="menuitem" onClick={choose(onDelete)} className={`${itemClass} text-red-600`}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
