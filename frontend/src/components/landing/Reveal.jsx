import { useEffect, useRef, useState } from "react";

// Fades its children up the first time they scroll into view. Children with
// the `stagger-item` class (and a `--i` index) follow one after another.
export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
