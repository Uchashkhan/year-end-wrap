import { PROFILES } from "../data/profiles";
import type { StoryPlan } from "../data/compose";
import { BADGES, CAPSTONE } from "../data/copy";
import { SLIDE_LABEL } from "../screens/registry";
import type { MotionPref } from "../lib/prefs";
import { COVER_VARIANTS, type CoverVariant } from "../explore/variant";

export const DEVICES = {
  "390x844": { w: 390, h: 844, label: "390×844 · brief reference" },
  "360x800": { w: 360, h: 800, label: "360×800 · common Android" },
  "360x640": { w: 360, h: 640, label: "360×640 · small Android" },
  "412x915": { w: 412, h: 915, label: "412×915 · large Android" },
} as const;
export type DeviceId = keyof typeof DEVICES;

export interface DevSettings {
  motion: MotionPref;
  repeatView: boolean;
  teacherEnabled: boolean;
  autoAdvance: boolean;
  device: DeviceId;
  /** Screen 01 exploration under review; "current" keeps the shipped cover. */
  cover: CoverVariant;
}

interface Props {
  profileId: string;
  onProfile: (id: string) => void;
  settings: DevSettings;
  onSettings: (s: DevSettings) => void;
  plan: StoryPlan;
  route: "home" | "story";
  index: number;
  onJump: (i: number) => void;
  onHome: () => void;
}

export function DevPanel({ profileId, onProfile, settings, onSettings, plan, route, index, onJump, onHome }: Props) {
  const set = <K extends keyof DevSettings>(k: K, v: DevSettings[K]) => onSettings({ ...settings, [k]: v });
  const profile = PROFILES.find((p) => p.id === profileId)!;
  const groups = ["Activity level", "Edge case"] as const;

  return (
    <aside className="dev" aria-label="Developer preview controls">
      <h1 className="dev-title">Wrap 2026 · M2 prototype</h1>
      <p className="dev-sub">
        Visual system applied; screen compositions still M1. <a href="?view=direction">Direction board →</a>
      </p>

      <section>
        <h2>Student profile</h2>
        {groups.map((g) => (
          <div key={g} className="dev-group">
            <h3>{g}</h3>
            {PROFILES.filter((p) => p.group === g).map((p) => (
              <label key={p.id} className="dev-radio">
                <input type="radio" name="profile" checked={p.id === profileId} onChange={() => onProfile(p.id)} />
                {p.label}
              </label>
            ))}
          </div>
        ))}
        <p className="dev-note">{profile.note}</p>
      </section>

      <section>
        <h2>
          Deck · {plan.slides.length} slides {plan.mode === "freshStart" && <em>(Fresh Start)</em>}
        </h2>
        <button type="button" className={`dev-slide ${route === "home" ? "on" : ""}`} onClick={onHome}>
          00 Home banner
        </button>
        <ol className="dev-slides">
          {plan.slides.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={`dev-slide ${route === "story" && i === index ? "on" : ""}`} onClick={() => onJump(i)}>
                {SLIDE_LABEL[s.id]}
              </button>
            </li>
          ))}
        </ol>
        {plan.omitted.length > 0 && plan.mode === "full" && (
          <>
            <h3>Omitted</h3>
            <ul className="dev-omitted">
              {plan.omitted.map((o) => (
                <li key={o.id}>
                  <b>{SLIDE_LABEL[o.id]}</b> — {o.reason}
                </li>
              ))}
            </ul>
          </>
        )}
        <h3>Earned</h3>
        <p className="dev-note">
          {plan.capstone && <>⭐ {CAPSTONE.name} · </>}
          {plan.badges.length ? plan.badges.map((b) => BADGES[b].name).join(" · ") : "No badges — none shown anywhere."}
        </p>
      </section>

      <section>
        <h2>View state</h2>
        <label className="dev-field">
          Motion
          <select value={settings.motion} onChange={(e) => set("motion", e.target.value as MotionPref)}>
            <option value="system">Follow system</option>
            <option value="reduce">Reduced</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label className="dev-check">
          <input type="checkbox" checked={settings.repeatView} onChange={(e) => set("repeatView", e.target.checked)} />
          Repeat view (banner seen, type pre-revealed)
        </label>
        <label className="dev-check">
          <input type="checkbox" checked={settings.teacherEnabled} onChange={(e) => set("teacherEnabled", e.target.checked)} />
          Teacher slide launch-ready (P0 dependency)
        </label>
        <label className="dev-check">
          <input type="checkbox" checked={settings.autoAdvance} onChange={(e) => set("autoAdvance", e.target.checked)} />
          Auto-advance 6s (hold to pause) — open question
        </label>
        <label className="dev-field">
          Cover (01)
          <select value={settings.cover} onChange={(e) => set("cover", e.target.value as CoverVariant)}>
            <option value="current">Approved Figma cover (current)</option>
            {COVER_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <p className="dev-note">
          <a href="?view=covers">Compare cover explorations side by side →</a>
        </p>
        <label className="dev-field">
          Device
          <select value={settings.device} onChange={(e) => set("device", e.target.value as DeviceId)}>
            {Object.entries(DEVICES).map(([k, d]) => (
              <option key={k} value={k}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="dev-help">
        <h2>Navigate</h2>
        <p>Tap right 70% → next · left 30% → back · swipe ←/→ · swipe ↓ or Esc closes · arrow keys on desktop.</p>
      </section>
    </aside>
  );
}
