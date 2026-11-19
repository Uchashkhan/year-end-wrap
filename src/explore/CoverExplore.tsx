/**
 * ?view=covers — Bold & Energetic cover explorations, side by side.
 * Each phone renders the real cover slide data (composeStory) inside the real
 * story chrome (ProgressBar + close), at true device size. Review tool only.
 */
import { useState, type ComponentType } from "react";
import { composeStory } from "../data/compose";
import { getProfile, PROFILES } from "../data/profiles";
import { PrefsProvider } from "../lib/prefs";
import { ProgressBar } from "../story/ProgressBar";
import type { ScreenProps } from "../screens/types";
import { DEVICES, type DeviceId } from "../dev/DevPanel";
import { CoverTypographic } from "./CoverTypographic";
import { CoverGeometry } from "./CoverGeometry";
import { CoverEditorial } from "./CoverEditorial";
import { CoverUnfolded } from "./CoverUnfolded";
import { COVER_VARIANTS } from "./variant";
import "./explore.css";

type V = "u" | "a" | "b" | "c";

const COMPONENTS: Record<V, ComponentType<ScreenProps<"cover">>> = {
  u: CoverUnfolded,
  a: CoverTypographic,
  b: CoverGeometry,
  c: CoverEditorial,
};

const CONCEPT: Record<V, string> = {
  u: "Your year, unfolded. One folded sheet carries ২০২৬: pleated at the lower-left, opening fold by fold toward the upper-right until the last panel lies flat and runs off the edge. Depth is the fold itself: foreshortened faces and the darker DS step on faces turned from the light.",
  a: "The year is the architecture. ২০ and ২৬ stacked at poster scale, each cropped by a different edge, with one magenta overprint slab. The name owns the calm lower third.",
  b: "The year built from four brand shapes: two leaves and two circles on opposite diagonals, with a flat, hard offset for depth. Controlled rhythm on Background Dark.",
  c: "A magazine cover with the student as the cover star. Their name is the masthead on a light ground; colour blocks below each hold one thing: the year, the invitation, the class.",
};

const REVIEW_PROFILES = ["high", "limited", "longName", "noName", "moderate"];

const noop = { next() {}, exitToHome() {}, share() {} };

function Phone({ id, profileId, device }: { id: V; profileId: string; device: DeviceId }) {
  const plan = composeStory(getProfile(profileId).record, { teacherSlideEnabled: true });
  const slide = plan.slides.find((s) => s.id === "cover");
  const C = COMPONENTS[id];
  const v = COVER_VARIANTS.find((x) => x.id === id)!;
  const d = DEVICES[device];
  return (
    <div className="device cxp-device" style={{ width: d.w, height: d.h }}>
      <div className="story" data-surface={v.surface}>
        <div className="story-chrome">
          <ProgressBar count={plan.slides.length} index={0} progress={1} />
          <span className="story-close" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
        </div>
        <div className="story-slide" data-surface={v.surface}>
          {slide?.id === "cover" ? (
            <C slide={slide} actions={noop} active />
          ) : (
            <p className="cxp-none">Fresh Start profile: this deck uses the Fresh Start cover, not Screen 01.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CoverExplore() {
  const q = new URLSearchParams(location.search);
  const [profileId, setProfileId] = useState(q.get("p") ?? "high");
  const [device, setDevice] = useState<DeviceId>((q.get("d") as DeviceId) ?? "390x844");
  const [focus, setFocus] = useState<"all" | V>((q.get("show") as V) ?? "u");
  const shown: readonly V[] = focus === "all" ? ["u", "a", "b", "c"] : [focus];

  return (
    <PrefsProvider motion="reduce" repeatView={false}>
      <div className="cxp">
        <header className="cxp-head">
          <div>
            <h1>Cover — Your Year, Unfolded</h1>
            <p>
              Static compositions of Screen 01 using Shikho Design System 1.1 tokens and Baloo Da 2. Same real cover data in all three; story chrome is
              the prototype's own. No animation yet.
            </p>
          </div>
          <div className="cxp-controls">
            <label>
              Student
              <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {REVIEW_PROFILES.map((p) => (
                  <option key={p} value={p}>
                    {PROFILES.find((x) => x.id === p)?.label ?? p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Device
              <select value={device} onChange={(e) => setDevice(e.target.value as DeviceId)}>
                {Object.entries(DEVICES).map(([k, d]) => (
                  <option key={k} value={k}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="cxp-seg" role="group" aria-label="Show">
              {(["u", "all", "a", "b", "c"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={focus === f} onClick={() => setFocus(f)}>
                  {f === "u" ? "Unfolded" : f === "all" ? "Compare all" : `${f.toUpperCase()} (archived)`}
                </button>
              ))}
            </div>
            <a href="?p=high">Back to prototype</a>
          </div>
        </header>

        <div className="cxp-row">
          {shown.map((id) => {
            const v = COVER_VARIANTS.find((x) => x.id === id)!;
            return (
              <section key={id} className="cxp-col">
                <header className="cxp-col-head">
                  <h2>{v.name}</h2>
                  <a href={`?p=${profileId}&cover=${id}`}>Tap through in prototype</a>
                </header>
                <Phone id={id} profileId={profileId} device={device} />
                <p className="cxp-concept">{CONCEPT[id]}</p>
              </section>
            );
          })}
        </div>
      </div>
    </PrefsProvider>
  );
}
