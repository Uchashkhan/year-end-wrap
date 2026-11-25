import type { ComponentType } from "react";
import type { Slide } from "../data/compose";
import type { ScreenProps } from "../screens/types";

/**
 * Motion versions: "original" (what ships today) and "refined" (the
 * screen-by-screen refinement, Phase 04 onwards). A refined screen is registered
 * here, beside its original, with the same props and data, so the Motion
 * Inspector can show both under identical conditions (?motion=refined in its
 * preview frame). Nothing is registered yet: every screen is original.
 *
 * The student-facing app always uses the original unless a refined screen has
 * been promoted (by changing the registry's default component, not by this file).
 */
export type MotionVersion = "original" | "refined";

type AnyScreen = ComponentType<ScreenProps<never>>;
/** Refined implementations by screen. Empty until refinement begins. */
export const REFINED: Partial<Record<Slide["id"], AnyScreen>> = {};

export const hasRefined = (id: Slide["id"]) => id in REFINED;

/** Development only: the version the inspector's preview frame asked for. */
export function motionVersionFromUrl(): MotionVersion {
  if (!import.meta.env.DEV || typeof location === "undefined") return "original";
  return new URLSearchParams(location.search).get("motion") === "refined" ? "refined" : "original";
}

/** The refined component for a slide, when the frame asks for refined motion and one exists. */
export function refinedFor(id: Slide["id"]): AnyScreen | undefined {
  return motionVersionFromUrl() === "refined" ? REFINED[id] : undefined;
}
