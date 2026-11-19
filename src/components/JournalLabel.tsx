import type { ReactNode } from "react";

/**
 * Journal label — the one notebook motif on the cover (M2, PROPOSED).
 * Modelled on the printed name label of a Bangladeshi exercise book:
 * small field captions, values written on a rule, a thin printed frame.
 * Reusable for the marksheet / export header later. Purely typographic.
 */
export function JournalLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`jlabel ${className}`}>{children}</div>;
}

export function JournalField({
  label,
  children,
  size = "md",
}: {
  label: string;
  children: ReactNode;
  size?: "md" | "xl";
}) {
  return (
    <div className={`jfield jfield-${size}`}>
      <span className="jfield-k">{label}</span>
      <span className="jfield-v">{children}</span>
    </div>
  );
}

/** Secondary fields side by side; wraps to stacked on narrow labels. */
export function JournalFieldRow({ children }: { children: ReactNode }) {
  return <div className="jfield-row">{children}</div>;
}
