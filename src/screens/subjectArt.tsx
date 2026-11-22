import type { SubjectId } from "../data/types";

/**
 * Screen 07 "Subject Takes Over" — subject → original Shikho subject icon.
 * Source: Figma "Report Card Revamp (W)", component set "Subject Icon"
 * (EkzF4RDp1YaveGsvKJKCde, node 2619:20376). Each file in
 * public/assets/subjects/ is that component's own vector layer, exported from
 * Figma unchanged (40 × 40 frame, original colours and gradients); only the
 * page/frame backgrounds the export wraps around it were removed.
 * Map a new subject here by adding its component's node and file.
 */
export const SUBJECT_ICON: Record<SubjectId, { src: string; figma: string; variant: string }> = {
  physics: { src: "/assets/subjects/physics.svg", figma: "2619:20361", variant: "Physics" },
  math: { src: "/assets/subjects/math.svg", figma: "2619:20367", variant: "General Math" },
  chemistry: { src: "/assets/subjects/chemistry.svg", figma: "2619:20371", variant: "Chemistry" },
  biology: { src: "/assets/subjects/biology.svg", figma: "2619:20374", variant: "Biology" },
  higherMath: { src: "/assets/subjects/higherMath.svg", figma: "2619:20373", variant: "Higher math" },
  bangla: { src: "/assets/subjects/bangla.svg", figma: "2619:20360", variant: "Bangla" },
  english: { src: "/assets/subjects/english.svg", figma: "2619:20372", variant: "English" },
  ict: { src: "/assets/subjects/ict.svg", figma: "2619:20369", variant: "ICT" },
};
