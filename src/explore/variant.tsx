import { createContext, useContext } from "react";
import type { Surface } from "../screens/registry";

/**
 * Cover exploration switch (Bold & Energetic, 3 directions).
 * "current" = the shipped M2 cover. A/B/C are explorations only — the
 * prototype default never changes unless a reviewer picks one in the dev panel.
 */
export type CoverVariant = "current" | "m3" | "m2" | "u" | "a" | "b" | "c";

export const COVER_VARIANTS: { id: Exclude<CoverVariant, "current">; name: string; surface: Surface }[] = [
  { id: "m3", name: "M3 geometric dome (archived)", surface: "cover" },
  { id: "u", name: "Your Year, Unfolded (archived)", surface: "cover" },
  { id: "m2", name: "M2 journal cover (archived)", surface: "cover" },
  { id: "a", name: "A · Typographic Impact (archived)", surface: "cover" },
  { id: "b", name: "B · Playful Geometry (archived)", surface: "cover" },
  { id: "c", name: "C · Editorial Celebration (archived)", surface: "light" },
];

export const CoverVariantCtx = createContext<CoverVariant>("current");
export const useCoverVariant = () => useContext(CoverVariantCtx);

/** Chrome tone for the cover slide: only the light-ground exploration needs dark chrome. */
export function coverSurface(v: CoverVariant): Surface {
  return COVER_VARIANTS.find((x) => x.id === v)?.surface ?? "cover";
}
