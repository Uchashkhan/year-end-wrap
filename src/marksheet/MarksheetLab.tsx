import { composeStory } from "../data/compose";
import { PROFILES } from "../data/profiles";
import { BentoCard, CARD_H, CARD_W } from "./Bento";
import { MarksheetCard, MarksheetExport } from "./MarksheetCard";
import { BentoV2Card, type V2Look } from "./BentoV2";

/**
 * Dev view `?view=marksheet&p=<profile>`: Screen 10's designs side by side —
 * Current, V2-A Bold Graphic and V2-B Refined Editorial — each V2 as the
 * private in-app card (with the student's identity) and as the export.
 * `&one=current|v2a|v2b` renders one card alone at its native 1080 × 1920
 * (add `&export=1` for a V2 export), which is how the export is checked.
 */
export function MarksheetLab() {
  const q = new URLSearchParams(location.search);
  const profile = PROFILES.find((p) => p.id === (q.get("p") ?? "high")) ?? PROFILES[0];
  const plan = composeStory(profile.record, { teacherSlideEnabled: q.get("teacher") !== "off" });
  const ms = plan.slides.find((s) => s.id === "marksheet");
  if (ms?.id !== "marksheet") return <p style={{ padding: 24 }}>No marksheet for “{profile.id}” (Fresh Start has none).</p>;
  const one = q.get("one");
  const exp = q.get("export") === "1";
  if (one === "current") return exp ? <MarksheetExport facts={ms.facts} /> : <MarksheetCard facts={ms.facts} owner={ms.owner} />;
  if (one === "bento") return <BentoCard facts={ms.facts} variant="a" />;
  if (one === "v2a" || one === "v2b") return <BentoV2Card facts={ms.facts} owner={exp ? null : ms.owner} look={one === "v2a" ? "a" : "b"} />;
  const s = Number(q.get("s") ?? 0.3);
  const cell = (title: string, node: React.ReactNode) => (
    <figure style={{ margin: 0, flex: "none" }}>
      <figcaption style={{ font: "600 13px/1.4 Inter, sans-serif", color: "#c9cce0", marginBottom: 8 }}>{title}</figcaption>
      <div style={{ width: CARD_W * s, height: CARD_H * s, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ transform: `scale(${s})`, transformOrigin: "0 0" }}>{node}</div>
      </div>
    </figure>
  );
  const v2 = (look: V2Look, exp: boolean) => <BentoV2Card facts={ms.facts} owner={exp ? null : ms.owner} look={look} />;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 28, padding: 28, background: "#23253a", minHeight: "100vh", alignItems: "flex-start" }}>
      {cell("Current · export", <MarksheetExport facts={ms.facts} />)}
      {cell("Previous Chapter Bento", <BentoCard facts={ms.facts} variant="a" />)}
      {cell("V2-A Bold · in-app", v2("a", false))}
      {cell("V2-A Bold · export", v2("a", true))}
      {cell("V2-B Editorial · in-app", v2("b", false))}
      {cell("V2-B Editorial · export", v2("b", true))}
    </div>
  );
}
