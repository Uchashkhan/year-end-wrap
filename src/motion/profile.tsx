import { createContext, useContext, type ReactNode } from "react";

/**
 * Global motion profile (development only): "original" (the approved motion,
 * unchanged) or "reference" (the reference prototype's motion personality, via
 * motion/primitives.ts). Independent of journey modes and screen facets.
 *
 * Resolution, highest first: the URL (`?mprofile=reference`, `?msparks=1`), the
 * dev panel, the default ("original", sparks off). A screen only changes under
 * "reference" once it has been moved onto the primitives (pilots: 06 Video,
 * 02 Study time — original clock). Screens that already are reference ports
 * (Quiz Activities, the Study Time sun and moon) are never touched by it.
 */
export type MotionProfile = "original" | "reference";

export interface MotionProfileState {
  profile: MotionProfile;
  /** Reference only: the optional one-shot landing sparks. */
  sparks: boolean;
}

export const PROFILE_DEFAULT: MotionProfileState = { profile: "original", sparks: false };

/** URL overrides (dev only; ignored in production builds). */
export function motionProfileFromUrl(): Partial<MotionProfileState> {
  if (!import.meta.env.DEV || typeof location === "undefined") return {};
  const q = new URLSearchParams(location.search);
  const out: Partial<MotionProfileState> = {};
  const p = q.get("mprofile");
  if (p === "reference" || p === "original") out.profile = p;
  const s = q.get("msparks");
  if (s === "1" || s === "0") out.sparks = s === "1";
  return out;
}

export function resolveMotionProfile(dev: Partial<MotionProfileState> = {}): MotionProfileState {
  if (!import.meta.env.DEV) return PROFILE_DEFAULT;
  return { ...PROFILE_DEFAULT, ...dev, ...motionProfileFromUrl() };
}

const Ctx = createContext<MotionProfileState>(PROFILE_DEFAULT);

export function MotionProfileProvider({ value, children }: { value: MotionProfileState; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMotionProfile = () => useContext(Ctx);
export const useReferenceMotion = () => useContext(Ctx).profile === "reference";
