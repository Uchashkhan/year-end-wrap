import { composeStory } from "../data/compose";
import { PROFILES } from "../data/profiles";
import { BentoCard, CARD_H, CARD_W, type BentoVariant } from "./Bento";

/**
 * Dev view for Screen 10's card: `?view=bento&p=<profile>` shows the three
 * explorations side by side; `&v=a|b|c` renders one card alone at its native
 * 1080 × 1920 at the page's top-left, which is how the export is checked.
 */
export function BentoLab() {
  const q = new URLSearchParams(location.search);
  const profile = PROFILES.find((p) => p.id === (q.get("p") ?? "high")) ?? PROFILES[0];
  const plan = composeStory(profile.record, { teacherSlideEnabled: q.get("teacher") !== "off" });
  const ms = plan.slides.find((s) => s.id === "marksheet");
  if (ms?.id !== "marksheet") return <p style={{ padding: 24 }}>No marksheet for “{profile.id}” (Fresh Start has none).</p>;
  const one = q.get("v") as BentoVariant | null;
  if (one) return <BentoCard facts={ms.facts} variant={one} />;
  const s = 0.42;
  return (
    <div style={{ display: "flex", gap: 32, padding: 32, background: "#2a2c3e", minHeight: "100vh", alignItems: "flex-start" }}>
      {(["a", "b", "c"] as const).map((v) => (
        <div key={v} style={{ width: CARD_W * s, height: CARD_H * s, flex: "none" }}>
          <BentoCard facts={ms.facts} variant={v} style={{ transform: `scale(${s})`, transformOrigin: "0 0" }} />
        </div>
      ))}
    </div>
  );
}
