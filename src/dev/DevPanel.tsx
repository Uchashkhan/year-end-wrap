import type { ReactNode } from "react";
import type { JourneyMode } from "../journey/journeyMode";
import type { MarksheetDesign } from "../marksheet/design";
import { PROFILES } from "../data/profiles";
import { DEFAULT_ORDER } from "../data/config";
import type { StoryPlan } from "../data/compose";
import { BADGES, CAPSTONE } from "../data/copy";
import { SLIDE_LABEL } from "../screens/registry";
import type { MotionPref } from "../lib/prefs";
import { COVER_VARIANTS, type CoverVariant } from "../explore/variant";
import type { MotionProfile } from "../motion/profile";
import type { FacetMap } from "../variants/facets";

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
  /** Dev-only comparison: the approved Cover + Closing, or the experimental Bird Journey pair. */
  journey: JourneyMode;
  /** Dev-only comparison for Screen 10: the approved Chapter Bento, or Marksheet V2-A / V2-B. */
  marksheet: MarksheetDesign;
  /** Screen-level effect overrides (variants/facets.tsx); a missing key is "auto" (the journey preset or the default). */
  facets: FacetMap;
  /** Global motion profile (motion/profile.tsx); the URL ?mprofile= / ?msparks= wins. */
  motionProfile: MotionProfile;
  /** Reference profile only: optional one-shot landing sparks. */
  motionSparks: boolean;
  /** 03 Live: the Front-Row Seat (original) or The Classroom Comes Alive (variants/facets.tsx live.design). */
  liveDesign: "original" | "alive" | "reserved";
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

/** "07 Subject of the year" → ["07", "Subject of the year"]. */
const splitLabel = (l: string) => {
  const m = l.match(/^(\S+)\s+(.*)$/);
  return m ? [m[1], m[2]] : ["", l];
};

/** A segmented control: one choice of a few, all visible. */
function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="dp-seg" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={`dp-seg-btn ${value === o.id ? "is-on" : ""}`} onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

/** An on/off switch with its explanation. */
function Toggle({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <label className="dp-toggle">
      <span className="dp-toggle-text">
        <span className="dp-toggle-title">{title}</span>
        <span className="dp-hint">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="dp-switch" aria-hidden="true" />
    </label>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="dp-field">
      <span className="dp-field-label">{label}</span>
      {children}
      {hint && <span className="dp-hint">{hint}</span>}
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="dp-section">
      <header className="dp-section-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/**
 * The prototype's control panel (dev-only). Sections, top to bottom, in the
 * order a review goes: where you are (sticky), who the student is, the deck
 * (with the dropped screens in place, and why), which design versions are
 * live, and how the preview behaves.
 */
export function DevPanel({ profileId, onProfile, settings, onSettings, plan, route, index, onJump, onHome }: Props) {
  const set = <K extends keyof DevSettings>(k: K, v: DevSettings[K]) => onSettings({ ...settings, [k]: v });
  const profile = PROFILES.find((p) => p.id === profileId)!;
  const total = plan.slides.length;
  const atHome = route === "home";
  const current = atHome ? "Home banner" : SLIDE_LABEL[plan.slides[index]?.id] ?? "";
  const [curNo, curName] = atHome ? ["00", "Home banner"] : splitLabel(current);
  const prev = () => (atHome ? undefined : index === 0 ? onHome() : onJump(index - 1));
  const next = () => (atHome ? onJump(0) : index < total - 1 ? onJump(index + 1) : undefined);

  // the deck in story order; in a full story, the screens this student doesn't get stay in place, dimmed, with the reason
  const omitted = new Map(plan.omitted.map((o) => [o.id, o.reason]));
  const rows: { id: string; i: number | null; reason?: string }[] =
    plan.mode === "full"
      ? DEFAULT_ORDER.map((id) => {
          const i = plan.slides.findIndex((s) => s.id === id);
          return { id, i: i >= 0 ? i : null, reason: i >= 0 ? undefined : omitted.get(id) };
        })
      : plan.slides.map((s, i) => ({ id: s.id, i }));

  return (
    <aside className="dp" aria-label="Prototype controls">
      <div className="dp-top">
        <div className="dp-brand">
          <span className="dp-brand-name">Wrap 2026</span>
          <span className="dp-brand-tag">Prototype</span>
        </div>
        {/* where you are, and the way through it */}
        <div className="dp-now" aria-live="polite">
          <span className="dp-now-no">{curNo}</span>
          <span className="dp-now-text">
            <span className="dp-now-name">{curName}</span>
            <span className="dp-hint">{atHome ? "Before the story" : `${index + 1} of ${total}`}</span>
          </span>
          <span className="dp-now-nav">
            <button type="button" className="dp-icon-btn" onClick={prev} disabled={atHome} aria-label="Previous screen" title="Previous screen">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            </button>
            <button type="button" className="dp-icon-btn" onClick={next} disabled={!atHome && index >= total - 1} aria-label="Next screen" title="Next screen">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </span>
        </div>
      </div>

      <Section title="Student">
        {(["Activity level", "Edge case"] as const).map((g) => (
          <div key={g} className="dp-chipset" role="radiogroup" aria-label={g}>
            <span className="dp-field-label">{g}</span>
            <div className="dp-chips">
              {PROFILES.filter((p) => p.group === g).map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={p.id === profileId} className={`dp-chip ${p.id === profileId ? "is-on" : ""}`} onClick={() => onProfile(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="dp-note">{profile.note}</p>
        <div className="dp-earned">
          <span className="dp-field-label">Earned</span>
          {plan.capstone || plan.badges.length ? (
            <div className="dp-badges">
              {plan.capstone && <span className="dp-badge is-cap">{CAPSTONE.name}</span>}
              {plan.badges.map((b) => (
                <span key={b} className="dp-badge">
                  {BADGES[b].name}
                </span>
              ))}
            </div>
          ) : (
            <span className="dp-hint">No badges — none shown anywhere.</span>
          )}
        </div>
      </Section>

      <Section title="Deck" aside={<span className="dp-count">{plan.mode === "freshStart" ? "Fresh Start · 2 screens" : `${total} of ${DEFAULT_ORDER.length} screens`}</span>}>
        <ol className="dp-deck">
          <li>
            <button type="button" className={`dp-row ${atHome ? "is-on" : ""}`} onClick={onHome} aria-current={atHome ? "step" : undefined}>
              <span className="dp-row-no">00</span>
              <span className="dp-row-name">Home banner</span>
            </button>
          </li>
          {rows.map((r) => {
            const [no, name] = splitLabel(SLIDE_LABEL[r.id as keyof typeof SLIDE_LABEL] ?? r.id);
            if (r.i == null)
              return (
                <li key={r.id}>
                  <div className="dp-row is-off" title={r.reason}>
                    <span className="dp-row-no">{no}</span>
                    <span className="dp-row-text">
                      <span className="dp-row-name">{name}</span>
                      <span className="dp-row-why">Dropped · {r.reason}</span>
                    </span>
                  </div>
                </li>
              );
            const on = !atHome && r.i === index;
            return (
              <li key={r.id}>
                <button type="button" className={`dp-row ${on ? "is-on" : ""}`} onClick={() => onJump(r.i!)} aria-current={on ? "step" : undefined}>
                  <span className="dp-row-no">{no}</span>
                  <span className="dp-row-name">{name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Versions">
        <Field label="Version" hint="Bird Journey: the bird cover (01) and sky-flight closing (11). Bird-led: the same, and the bird takes part in the screens between (so far 02, The Timekeeper).">
          <Seg
            label="Wrap version"
            value={settings.journey}
            options={[
              { id: "current", name: "Current" },
              { id: "bird", name: "Bird Journey" },
              { id: "birdled", name: "Bird-led" },
            ]}
            onChange={(v) => set("journey", v)}
          />
        </Field>
        <Field label="Cover (01)">
          <select className="dp-select" value={settings.cover} onChange={(e) => set("cover", e.target.value as CoverVariant)}>
            <option value="current">Approved Figma cover (current)</option>
            {COVER_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Live classes">
        <Field label="03 Live · Design" hint="The Classroom Comes Alive: a classroom with the attendance lit seat by seat. URL ?live.design= wins.">
          <Seg
            label="Live design"
            value={settings.liveDesign}
            options={[
              { id: "original", name: "Front-Row Seat" },
              { id: "alive", name: "Classroom Comes Alive" },
              { id: "reserved", name: "Reserved Seat" },
            ]}
            onChange={(v) => set("liveDesign", v)}
          />
        </Field>
      </Section>

      <Section title="Motion profile">
        <Field label="Motion" hint="Reference: the reference prototype's motion language on the screens moved onto it so far (06 Video, 02 Study time). URL ?mprofile= wins.">
          <Seg
            label="Motion profile"
            value={settings.motionProfile}
            options={[
              { id: "original", name: "Original" },
              { id: "reference", name: "Reference" },
            ]}
            onChange={(v) => set("motionProfile", v)}
          />
        </Field>
        {settings.motionProfile === "reference" && (
          <Toggle title="Landing sparks" hint="One-shot sparks when a hero number lands (Reference only)." checked={settings.motionSparks} onChange={(v) => set("motionSparks", v)} />
        )}
      </Section>


      <Section title="Preview">
        <Field label="Device" hint={DEVICES[settings.device].label.split(" · ")[1]}>
          <Seg
            label="Device"
            value={settings.device}
            options={(Object.keys(DEVICES) as DeviceId[]).map((k) => ({ id: k, name: k.replace("x", "×") }))}
            onChange={(v) => set("device", v)}
          />
        </Field>
        <Field label="Motion">
          <Seg
            label="Motion"
            value={settings.motion}
            options={[
              { id: "system", name: "System" },
              { id: "reduce", name: "Reduced" },
              { id: "full", name: "Full" },
            ]}
            onChange={(v) => set("motion", v as MotionPref)}
          />
        </Field>
        <div className="dp-toggles">
          <Toggle checked={settings.repeatView} onChange={(v) => set("repeatView", v)} title="Repeat view" hint="Banner seen, learner type pre-revealed." />
          <Toggle checked={settings.teacherEnabled} onChange={(v) => set("teacherEnabled", v)} title="Teacher screen launch-ready" hint="P0 dependency — off drops Screen 04." />
          <Toggle checked={settings.autoAdvance} onChange={(v) => set("autoAdvance", v)} title="Auto-advance (6 s)" hint="Hold to pause. Open question." />
        </div>
      </Section>

      <Section title="Review boards">
        <nav className="dp-links" aria-label="Review boards">
          <a href="?view=direction">Direction board</a>
          <a href="?view=covers">Cover explorations</a>
          <a href="?view=marksheet">Marksheet versions</a>
          <a href="?view=bird">Bird poses</a>
        </nav>
      </Section>

      <footer className="dp-keys">
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> step
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
        <span>Tap right 70 % next · left 30 % back</span>
      </footer>
    </aside>
  );
}
