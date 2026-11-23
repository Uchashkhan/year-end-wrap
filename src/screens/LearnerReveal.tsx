import { useEffect, useRef } from "react";
import { usePresence } from "motion/react";
import { COPY, LEARNER_TYPES } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { LearnerBadge } from "../components/LearnerBadge";
import type { ScreenProps } from "./types";
import "../styles/learner-reveal.css";

/** The reference's whole reveal, in seconds (shikho_learner_type_big_reveal.html: 1650 ms). */
const DURATION = 1.65;
/** Longest clock step (s): a long frame slows the reveal for a moment instead of skipping ahead. */
const MAX_STEP = 1 / 40;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (x: number) => 1 - (1 - clamp(x)) ** 3;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * 09 Learner type — "The Big Reveal" (shikho_learner_type_big_reveal.html,
 * Option A layout and motion; Option B is not used).
 *
 * Copy (PRD Screen 9): headline "তোমার শেখার ধরন কী?"; setup "সারা বছরের শেখার
 * অভ্যাস দেখে তোমার জন্য আছে একটি বিশেষ পরিচয়।"; reveal [শিক্ষার্থীর ধরন] —
 * the server-assigned type (compose.ts; "balanced" is the honest fallback); the
 * line under it is that type's data-tied reason (LEARNER_TYPES). Actions:
 * "আমার মার্ক শিট দেখি" → Screen 10, "শেয়ার করো" → the share sheet.
 * Not used from the reference (not PRD): its eyebrow, the vertical "WRAP 2026" /
 * "SHIKHO" watermarks, the "তোমার শেখার পরিচয়" label and its demo reason line.
 *
 * Anticipation → badge reveal → identity → settle, one continuous reveal with
 * the reference's progress map (p = 0 → 1 over 1.65 s): the badge falls in from above —
 * blurred, tilted, large → sharp, upright, at rest (.18–.59) — the shine sweeps
 * the badge once (.55–.9), the identity rises (.53–.79), the actions last
 * (.71–.94). Ground: the section's Warm Violet (Figma 103:731, via the shared
 * background — background.ts); the reference's magenta flood is not used.
 * No rings, ticks, accent strokes, sparks, corner outlines or centre glow.
 * The badge is LearnerBadge (replaceable per type). Reduced motion / repeat
 * view: the final frame.
 */
export function LearnerReveal({ slide, actions }: ScreenProps<"learnerType">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const scope = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const ctl = useRef<{ stop: () => void; finish: () => void } | null>(null);
  const t = LEARNER_TYPES[slide.type];

  useEffect(() => {
    const root = scope.current;
    if (!root || still) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    const u = root.clientWidth / 390; // reference px → frame px
    const badge = q(".lt-badge");
    const shadow = q(".lt-badge-shadow");
    const shine = q(".lt-shine");
    const header = q(".lt-header");
    const type = q(".lt-type");
    const acts = q(".lt-actions");
    const all = [badge, shadow, shine, header, type, acts];

    // The reference's render(p), unchanged in its mapping.
    const render = (p: number) => {
      const land = ease(range(p, 0.18, 0.59));
      const show = ease(range(p, 0.53, 0.79));
      const cta = ease(range(p, 0.71, 0.94));
      badge.style.opacity = range(p, 0.18, 0.34).toFixed(3);
      badge.style.transform = `translateY(${(lerp(-165, 0, land) * u).toFixed(2)}px) rotate(${lerp(-14, 0, land).toFixed(3)}deg) scale(${lerp(1.37, 1, land).toFixed(4)})`;
      const blur = lerp(7, 0, range(p, 0.2, 0.43));
      badge.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
      shadow.style.opacity = (land * 0.45).toFixed(3);
      shadow.style.transform = `scale(${lerp(0.5, 1, land).toFixed(4)})`;
      type.style.opacity = show.toFixed(3);
      type.style.transform = `translateY(${lerp(25, 0, show).toFixed(2)}px)`;
      acts.style.opacity = cta.toFixed(3);
      acts.style.transform = `translateY(${lerp(18, 0, cta).toFixed(2)}px)`;
      acts.style.pointerEvents = cta > 0.5 ? "auto" : "none";
      header.style.transform = `translateY(${lerp(10, 0, ease(range(p, 0, 0.33))).toFixed(2)}px)`;
      header.style.opacity = (0.65 + 0.35 * range(p, 0, 0.3)).toFixed(3);
      // One sweep of the shine across the badge (the reference's on/off step, eased in and out).
      const sw = range(p, 0.55, 0.9);
      shine.style.opacity = (0.55 * Math.sin(Math.PI * sw)).toFixed(3);
      shine.style.transform = `translateX(${lerp(-160, 180, sw).toFixed(2)}%)`;
    };
    const finish = () => {
      // The resting frame is CSS: clear every inline style the reveal set.
      all.forEach((el) => el.removeAttribute("style"));
      root.classList.remove("is-pre");
    };

    render(0);
    root.classList.remove("is-pre");
    let time = 0;
    let last = 0;
    let raf = requestAnimationFrame(function tick(now) {
      if (last) time += Math.max(0, Math.min(MAX_STEP, (now - last) / 1000));
      last = now;
      if (time >= DURATION) {
        render(1);
        finish();
        return;
      }
      render(time / DURATION);
      raf = requestAnimationFrame(tick);
    });
    const stop = () => cancelAnimationFrame(raf);
    ctl.current = { stop, finish };
    return stop;
  }, [still]);

  // Leaving: stop; removal is immediate. Revived before removal (rapid
  // back/forward taps): snap to the final frame — the reveal plays once.
  const wasLeaving = useRef(false);
  useEffect(() => {
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        ctl.current?.finish();
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={scope} className={`slide lt ${still ? "" : "is-pre"}`}>

      <div className="lt-header">
        <h2 className="lt-question">{COPY.learnerType.headline}</h2>
        <p className="lt-sub">{COPY.learnerType.prdSetup}</p>
      </div>

      <div className="lt-badge-stage" aria-hidden="true">
        <div className="lt-badge-shadow" />
        <div className="lt-badge">
          <LearnerBadge type={slide.type} />
          <div className="lt-shine" />
        </div>
      </div>


      <div className="lt-type">
        <div className="lt-pre">{COPY.learnerType.label}</div>
        <h1 className="lt-name">{t.name}</h1>
        <p className="lt-reason">{slide.reason}</p>
        {t.verify && <p className="dev-flag">VERIFY: night-owl needs confirmed hour-band data</p>}
      </div>

      <div className="lt-actions">
        <button type="button" className="lt-primary" onClick={actions.next}>
          {COPY.learnerType.prdPrimary} <span aria-hidden="true">↗</span>
        </button>
        <button type="button" className="lt-secondary" onClick={() => actions.share("type")}>
          {COPY.learnerType.secondary}
        </button>
      </div>
    </div>
  );
}
