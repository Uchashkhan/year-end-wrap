import { createContext, useContext } from "react";

/**
 * Development-only comparison for Screen 10:
 *   "current"  the approved Chapter Bento (Bento.tsx)
 *   "v2a"      Marksheet V2 — A, Bold Graphic (BentoV2.tsx)
 *   "v2b"      Marksheet V2 — B, Refined Editorial (BentoV2.tsx)
 * Set from the dev panel (persisted with the other dev settings) or
 * `?ms=current|v2a|v2b`. The student-facing default is always "current".
 */
export type MarksheetDesign = "current" | "v2a" | "v2b";
export const MARKSHEET_DESIGNS: { id: MarksheetDesign; name: string }[] = [
  { id: "current", name: "Current" },
  { id: "v2a", name: "V2-A Bold" },
  { id: "v2b", name: "V2-B Editorial" },
];
export const MarksheetDesignCtx = createContext<MarksheetDesign>("current");
export const useMarksheetDesign = () => useContext(MarksheetDesignCtx);
export const marksheetDesignFromUrl = (): MarksheetDesign | null => {
  const v = typeof location !== "undefined" ? new URLSearchParams(location.search).get("ms") : null;
  return v === "current" || v === "v2a" || v === "v2b" ? v : null;
};
