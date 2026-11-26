import { BADGES, CAPSTONE } from "./copy";
import firstBencherUrl from "../assets/badges/first-bencher.svg?url";
import quizWarriorUrl from "../assets/badges/quiz-warrior.svg?url";
import videoMarathonerUrl from "../assets/badges/video-marathoner.svg?url";
import streakMasterUrl from "../assets/badges/streak-master.svg?url";
import capstoneUrl from "../assets/badges/capstone.svg?url";
import type { BadgeId } from "./compose";

/**
 * Finalized badge artwork (Figma: "Shikho · Year End Wrap · 2026", section
 * "Badges" 163:2; 26 Nov 2026). One source for every place a badge is drawn
 * (story screens, the marksheet, share cards). Each file (src/assets/badges) is the badge's vector
 * group exported as SVG, untouched: flat fills, no background, transparent, the
 * badge name drawn as part of the artwork (outlined type). Sizes are the art's
 * own (450 wide; heights differ), so keep the aspect ratio when placing.
 *
 * Achievement badges only. The learner type has its own artwork (LearnerBadge)
 * and is a separate concept.
 */
export type BadgeArtId = BadgeId | "capstone";

export interface BadgeArtAsset {
  src: string;
  /** The art's own size (px at 1×). */
  width: number;
  height: number;
  /** The badge's name (also drawn in the artwork) — the image's accessible name. */
  name: string;
  /** Figma source node (frame / vector group). */
  figma: { frame: string; group: string; name: string };
}

export const BADGE_ART: Record<BadgeArtId, BadgeArtAsset> = {
  firstBencher: {
    src: firstBencherUrl,
    width: 450,
    height: 282.977,
    name: BADGES.firstBencher.name,
    figma: { frame: "143:7140", group: "143:7177", name: "First Bencher" },
  },
  quizWarrior: {
    src: quizWarriorUrl,
    width: 450,
    height: 379.77,
    name: BADGES.quizWarrior.name,
    figma: { frame: "143:7225", group: "143:7255", name: "Quiz Joddha" },
  },
  videoMarathoner: {
    src: videoMarathonerUrl,
    width: 450,
    height: 288.636,
    name: BADGES.videoMarathoner.name,
    figma: { frame: "143:7278", group: "143:7350", name: "Video marathon" },
  },
  streakMaster: {
    src: streakMasterUrl,
    width: 450,
    height: 338.716,
    name: BADGES.streakMaster.name,
    figma: { frame: "143:7374", group: "143:7463", name: "Streak Master" },
  },
  capstone: {
    src: capstoneUrl,
    width: 450,
    height: 309.346,
    name: CAPSTONE.name,
    figma: { frame: "143:7495", group: "143:7572", name: "Sherader Shera" },
  },
};
