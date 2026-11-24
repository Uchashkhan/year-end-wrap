import { useEffect, useLayoutEffect, useRef } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { Button } from "../components/primitives";
import { useEntry } from "../story/entry";
import { ShareIcon } from "../journey/ExperimentalBirdJourneyClosingSky";
import type { ScreenProps } from "./types";
import "../styles/journey.css"; // the shared next-step panel (.bjs-next …), unchanged
import "../styles/year-turns.css";

/**
 * "The Year Turns" — one master timeline (s); the reference's choreography
 * (shikho_2027_year_turns.html), started after the marksheet's exit:
 *   0–0.55     the marksheet recedes as one artifact; the closing's ground and
 *              hero come up under it (no Cover, no blank frame)
 *   0.2–0.96   the outlines, then ২০২৬ settles in (as the card clears)
 *   0.85–2.0   the year turns: ২০২ holds, the last digit rolls ৬ → ৭ in its
 *              yellow window; the outlines drift with it
 *   1.7–2.25   the closing line (and, with no program, its actions)
 *   3.45–4.2   with a recommended program, after the ending has breathed: the
 *              Bird Journey's next-step panel (same component, same behaviour —
 *              banner, "প্রোগ্রামে ভর্তি হও", share icon) slides up; the hero
 *              scales back and rises to make room
 * Reduced motion / repeat view: the final frame, still.
 */
export const YEAR_TURNS = {
  ms: { at: 0, dur: 0.55 },
  hero: { at: 0.2, dur: 0.55 },
  year: { at: 0.36, dur: 0.6 },
  roll: { at: 0.85, dur: 1.15 },
  line: { at: 1.7, dur: 0.55 },
  actions: { at: 1.85, dur: 0.5 },
  end: 2.35,
  offer: { at: 3.45, dur: 0.75 },
  offerEnd: 4.2,
} as const;

/** The line, exactly as given, with one word kept whole (no break inside "২০২৭-এ"). */
function keepTogether(text: string, word: string) {
  const i = text.indexOf(word);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ whiteSpace: "nowrap" }}>{word}</span>
      {text.slice(i + word.length)}
    </>
  );
}

export function YearTurnsClosing({ slide, actions }: ScreenProps<"close">) {
  const program = slide.program;
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromMarksheet = useEntry().kind === "onward";
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const ctl = useRef<{ stop: () => void; finish: () => void } | null>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const el: HTMLDivElement = node;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const W = el.clientWidth;
    const H = el.clientHeight;
    const C = YEAR_TURNS;
    // the roll: one digit up — the line (1.36 em) less the overlap between the two (0.6 em, CSS)
    const ROLL = -(1.36 - 0.6) * parseFloat(getComputedStyle(el.querySelector(".yt-year")!).fontSize);

    const hero = q(".yt-hero");
    const ringA = q(".yt-ring-a");
    const ringB = q(".yt-ring-b");
    const year = q(".yt-year");
    const wheel = q(".yt-wheel");
    const line = q(".yt-line");
    const actionsEl = q(".yt-actions"); // the ending's own actions (no program only)
    const bottom = q(".yt-bottom");

    // ── the next-step panel: measured with its slot collapsed (the ending before it), in every mode ──
    const GAP = parseFloat(getComputedStyle(bottom).rowGap) || 10;
    const slot = program ? q(".bjs-next") : null;
    const panel = slot ? q(".bjs-next-panel") : null;
    if (slot) gsap.set(slot, { height: 0, marginTop: -GAP });
    const panelH = panel ? panel.offsetHeight : 0;
    if (panel) q<HTMLImageElement>(".bjs-card").decode?.().catch(() => {});
    // the hero takes the band between the story controls and the closing line (as it stands before
    // any panel); the year group centres in it
    const lineTop = H - parseFloat(getComputedStyle(bottom).bottom) - bottom.offsetHeight;
    const bandTop = Math.max(58, 0.07 * H);
    hero.style.top = `${bandTop}px`;
    hero.style.height = `${Math.max(0, lineTop - 12 - bandTop)}px`;
    // the hero's make-room move: the reference's (scale 0.87, up 13% of the width), or more if
    // the panel needs it, so the year always clears the line
    const heroBox = { top: hero.offsetTop, h: hero.offsetHeight };
    const centre = heroBox.top + heroBox.h / 2;
    const yearBottom = heroBox.top + year.offsetTop + year.offsetHeight;
    const lineTopAfter = H - parseFloat(getComputedStyle(bottom).bottom) - bottom.offsetHeight - panelH - GAP;
    const sc = 0.87;
    const need = lineTopAfter - 14 - (centre + (yearBottom - centre) * sc);
    const offer = { scale: sc, y: Math.min(-0.13 * W, need) };

    const final = () => {
      gsap.set([hero, ringA, ringB, year, line, actionsEl].filter(Boolean), { clearProps: "opacity,transform" });
      gsap.set(wheel, { y: ROLL });
      gsap.set(ringA, { x: -6 });
      gsap.set(ringB, { x: 6 });
      if (slot && panel) {
        gsap.set(slot, { height: panelH, marginTop: 0 });
        gsap.set(panel, { yPercent: 0, opacity: 1 });
        gsap.set(hero, { y: offer.y, scale: offer.scale });
      }
    };
    if (still) {
      final();
      return;
    }

    // ── initial state ──
    gsap.set([ringA, ringB], { opacity: 0 });
    gsap.set(year, { opacity: 0, y: 0.04 * W });
    gsap.set(wheel, { y: 0 });
    gsap.set(line, { opacity: 0, y: 12 });
    if (actionsEl) gsap.set(actionsEl, { opacity: 0, y: 12 });
    if (panel) gsap.set(panel, { yPercent: 35, opacity: 0 });

    const tl = gsap.timeline({ onComplete: () => finish() });

    // the marksheet recedes as one artifact (only when we came from it); the closing comes up under it
    const ms = fromMarksheet ? el.closest(".story")?.querySelector<HTMLElement>(".slide.ms") : null;
    const msTouched: HTMLElement[] = ms ? [...ms.querySelectorAll<HTMLElement>(".ms-card, .ms-title, .ms-foot")] : [];
    const restoreMarksheet = () => {
      if (!ms?.isConnected) return;
      gsap.killTweensOf(msTouched);
      gsap.set(msTouched, { clearProps: "opacity,transform" });
    };
    if (ms) {
      const g = (s: string) => [...ms.querySelectorAll<HTMLElement>(s)];
      tl.to(g(".ms-foot, .ms-title"), { opacity: 0, duration: 0.22, ease: "sine.in" }, C.ms.at);
      tl.to(g(".ms-card"), { scale: 0.84, y: -0.05 * H, opacity: 0, transformOrigin: "50% 40%", duration: C.ms.dur, ease: "power2.in" }, C.ms.at);
    }
    tl.to([ringA, ringB], { opacity: 1, duration: C.hero.dur, ease: "sine.out" }, C.hero.at);
    tl.to(year, { opacity: 1, y: 0, duration: C.year.dur, ease: "power3.out" }, C.year.at);
    // the year turns: the last digit rolls in its window; the outlines drift with it
    tl.to(wheel, { y: ROLL, duration: C.roll.dur, ease: "power2.inOut" }, C.roll.at);
    tl.to(ringA, { x: -6, duration: C.roll.dur, ease: "sine.inOut" }, C.roll.at);
    tl.to(ringB, { x: 6, duration: C.roll.dur, ease: "sine.inOut" }, C.roll.at);
    tl.to(line, { opacity: 1, y: 0, duration: C.line.dur, ease: "power2.out" }, C.line.at);
    if (actionsEl) tl.to(actionsEl, { opacity: 1, y: 0, duration: C.actions.dur, ease: "power2.out" }, C.actions.at);
    tl.set({}, {}, C.end);
    // the next step, after the ending has breathed (no tap)
    if (slot && panel) {
      const O = C.offer;
      tl.to(slot, { height: panelH, marginTop: 0, duration: O.dur, ease: "power3.inOut" }, O.at);
      tl.to(panel, { yPercent: 0, opacity: 1, duration: O.dur, ease: "power3.out" }, O.at + 0.06);
      tl.to(hero, { y: offer.y, scale: offer.scale, duration: O.dur, ease: "power3.inOut" }, O.at);
      tl.set({}, {}, C.offerEnd);
    }

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      tl.progress(1);
      tl.kill();
      final();
    }
    ctl.current = {
      stop: () => {
        tl.kill();
        restoreMarksheet();
      },
      finish,
    };
    return () => {
      tl.kill();
    };
    // the entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // Leaving: stop (and hand Screen 10 back if it is still there); revived before removal: the final frame.
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
    <div ref={root} className="slide yt">
      <p className="yt-sr">২০২৭। {COPY.close.prdLine}</p>
      <div className="yt-hero" aria-hidden="true">
        <i className="yt-ring yt-ring-a" />
        <i className="yt-ring yt-ring-b" />
        <div className="yt-year">
          <span className="yt-digits">২০২</span>
          <span className="yt-window">
            <span className="yt-wheel">
              <span>৬</span>
              <span>৭</span>
            </span>
          </span>
        </div>
      </div>
      <div className="yt-bottom">
        <p className="yt-line" aria-hidden="true">
          {keepTogether(COPY.close.prdLine, "২০২৭-এ")}
        </p>
        {program ? (
          // the Bird Journey's next-step panel, reused as is
          <div className="bjs-next">
            <div className="bjs-next-panel">
              <img className="bjs-card" src={program.bannerUrl} alt={program.name} draggable={false} decoding="async" />
              <div className="bjs-next-row">
                <Button kind="primary" onClick={() => actions.openProgram(program.url)}>
                  {COPY.close.enroll}
                </Button>
                <button type="button" className="bjs-share" aria-label={COPY.close.secondary} title={COPY.close.secondary} onClick={() => actions.share("marksheet")}>
                  <ShareIcon />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="yt-actions">
            <button type="button" className="btn yt-primary" onClick={actions.exitToHome}>
              {COPY.close.primary}
            </button>
            <button type="button" className="btn yt-secondary" onClick={() => actions.share("marksheet")}>
              {COPY.close.secondary}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
