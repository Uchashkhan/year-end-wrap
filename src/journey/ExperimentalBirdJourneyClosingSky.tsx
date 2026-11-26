import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { Button } from "../components/primitives";
import { useEntry } from "../story/entry";
import { BIRD_HOVER, BIRD_WINGS, flightPose, smooth, wingCycles } from "../motion/birdFlight";
import { gsapEase } from "../motion/ease";
import { devRegister, fromGsap } from "../motion/timeline";
import { Bird3DImage, Bird3DWind, birdFrames, createBird3DEnvironment } from "./Bird3DFlight";
import type { ScreenProps } from "../screens/types";
import { BirdRig } from "./BirdCharacter";
import { createFlight, type Cloud } from "./flight";
import { CHECKPOINT, SkyCheckpoint } from "./SkyCheckpoint";
import "../styles/journey.css";

/** The opening's clouds (Reference 01, Figma px at 412), recycled as the bird climbs. */
const CLOUDS = [
  { src: "cloud1", x: -42, y: 150, w: 178, h: 73, depth: 1 },
  { src: "cloud2", x: -13, y: 470, w: 120, h: 55, depth: 0.78 },
  { src: "cloud3", x: 330, y: 330, w: 91, h: 40, depth: 0.58 },
  { src: "cloud3", x: 300, y: -140, w: 91, h: 40, depth: 0.62 },
  { src: "cloud1", x: 262, y: -430, w: 178, h: 73, depth: 1.05 },
  { src: "cloud2", x: -40, y: -700, w: 120, h: 55, depth: 0.8 },
] as const;

/** The flight's climb rate at full speed (px/s at 412 wide, as the opening); the checkpoint is far (slow). */
const CLIMB = 900;
const CHECK_DEPTH = 0.3;

/**
 * "Sky flight" closing — one master timeline (s), phases overlapping:
 *   0–0.6      the marksheet recedes as one artifact; the opening's sky comes up (0.04–0.46)
 *   0.34–1.3   once the sky is up, the flying bird rises into frame from below — already mid-climb,
 *              wings beating, airflow streaming, clouds passing
 *   0.2–4.3    the climb: one speed value drives the wingbeat, airflow, clouds and
 *              the checkpoint (full cruise, then a long ease to a steady, slower beat);
 *              the ২০২৭ checkpoint comes down from the top of the sky, far away
 *              (slow) and a little smaller, growing as the bird nears it
 *   3.2–4.3    the bird eases from the middle of the frame into its place below the
 *              checkpoint, a little smaller (farther in), still flying
 *   4.3–4.95   the closing line (masked rise), then the actions
 *   6.45–7.35  (with a recommended program) the next-step panel — see `reveal`;
 *              then the line stands alone until it arrives (no actions before it)
 * Settled: it keeps flying — wings beating, clouds drifting by — on its way.
 */
export const SKY_CLOSING = {
  ms: { at: 0, dur: 0.6 },
  sky: { at: 0.04, dur: 0.42 },
  rise: { at: 0.34, dur: 0.95 },
  climb: { at: 0.2, dur: 4.1 },
  place: { at: 3.0, dur: 1.3 },
  line: { at: 4.3, dur: 0.55 },
  actions: { at: 4.45, dur: 0.5 },
  end: 4.95,
  /**
   * The next step (only when the student has a recommended program). The
   * ending holds the line alone (~1.5 s), then — on the same timeline, no tap —
   * one panel slides up from the bottom: the program's banner with its action,
   * "প্রোগ্রামে ভর্তি হও", and sharing as an icon beside it. The line and the
   * bird make room; the checkpoint eases a little smaller to keep its place.
   * One action set, shown once — never a label that changes under the finger.
   */
  reveal: { at: 6.45, dur: 0.85 },
  revealEnd: 7.35,
} as const;

/** Speed over the climb (u = 0…1): already flying fast, a held cruise, then a long ease down to a steady beat. */
function speedProfile() {
  const v = (u: number) => {
    if (u < 0.45) return 0.9 + 0.1 * Math.sin((u / 0.45) * Math.PI);
    const k = (u - 0.45) / 0.55;
    return 0.22 + 0.68 * (1 - k) ** 2;
  };
  const N = 600;
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + v((i - 0.5) / N) / N);
  return {
    v: (u: number) => v(Math.max(0, Math.min(1, u))),
    /** distance covered by u, in "full-speed seconds" per unit of duration */
    D: (u: number) => {
      const x = Math.max(0, Math.min(1, u)) * N;
      const i = Math.floor(x);
      return cum[i] + (cum[Math.min(N, i + 1)] - cum[i]) * (x - i);
    },
  };
}

/** Share: a box with an arrow leaving it (2 px stroke, round caps). */
export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5v11" />
      <path d="M7.5 8 12 3.5 16.5 8" />
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16" />
    </svg>
  );
}

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

/**
 * EXPERIMENT — 11 Closing, "Sky flight" (Journey: "Bird Journey · Sky"; the
 * approved Closing and the "Next Checkpoint" closing are untouched).
 * Marksheet → straight into the opening's sky, the flying bird already climbing →
 * the ২০২৭ checkpoint comes into view ahead → the closing line and actions.
 * No Cover callback, no ২০২৬ composition. Reuses the opening's sky, clouds,
 * flying rig and flight system (createFlight). Tap to skip to the settled
 * frame. Reduced motion / repeat view: the settled frame, still.
 */
export function ExperimentalBirdJourneyClosingSky({ slide, actions, raster = false }: ScreenProps<"close"> & { raster?: boolean }) {
  const program = slide.program;
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromMarksheet = useEntry().kind === "onward";
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const [playing, setPlaying] = useState(!still);
  const ctl = useRef<{ stop: () => void; finish: () => void; skip: () => void } | null>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const el: HTMLDivElement = node;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const qa = <T extends Element = HTMLElement>(s: string) => [...el.querySelectorAll(s)] as T[];
    const W = el.clientWidth;
    const H = el.clientHeight;
    const f = W / 412;
    const C = SKY_CLOSING;

    const rig = q(".bj-rig");
    if (!raster) gsap.set(q(".bj-rest"), { opacity: 0 });
    const mascot = raster ? q<HTMLElement>(".b3-bird") : null;
    const wings = mascot && !still ? birdFrames(mascot) : null;
    const BW = raster ? 188 : 200.173;
    const BH = raster ? BW * 2222 / 2158 : 152.315;
    if (raster) rig.style.width = `${BW}px`;
    const environment = raster ? createBird3DEnvironment(el, CLOUDS) : null;
    environment?.measure({ w: W, h: H, ratio: f });

    // ── the settled composition: checkpoint above, bird in the middle, words below ──
    // (measured with the next-step panel's slot collapsed — the ending before it — in every mode)
    const copy = q(".bjs-copy");
    const GAP = parseFloat(getComputedStyle(copy).rowGap) || 22; // the line ↔ panel gap
    const slot = program ? q(".bjs-next") : null;
    if (slot) gsap.set(slot, { height: 0, marginTop: -GAP });
    const copyTop = H - copy.offsetHeight - parseFloat(getComputedStyle(copy).bottom);
    const top0 = Math.max(70, 0.08 * H);
    const compose = (top: number) => {
      const avail = top - 12 - top0;
      const gh = Math.min(avail * 0.4, ((0.76 * W) * CHECKPOINT.h) / CHECKPOINT.w);
      const bs = Math.max(raster ? 0.28 : 0.5, Math.min(0.86, ((avail - gh) * 0.72) / (BH * f))) * f; // the bird's scale
      const free = avail - gh - BH * bs;
      return { gh, bird: { x: W / 2 - (BW / 2) * bs, y: top0 + gh + free * 0.55, scale: bs } };
    };
    const settled = compose(copyTop);
    const gh = settled.gh;
    const gw = (gh * CHECKPOINT.w) / CHECKPOINT.h;
    const check = q(".bjs-check");
    check.style.width = `${gw}px`;
    const checkEnd = { x: (W - gw) / 2, y: top0 };
    const birdEnd = settled.bird;
    // with the next-step panel: the words rise by the panel (+ its gap); everything above makes room
    const panel = slot ? q(".bjs-next-panel") : null;
    const panelH = panel ? panel.offsetHeight : 0;
    const after = slot ? compose(copyTop - panelH - GAP) : null;
    const chk = { k: 1 };
    const kAfter = after ? after.gh / gh : 1;
    // in flight: the opening's cruise place — centred, at Figma size
    const cruise = { x: W / 2 - (BW / 2) * f, y: H * 0.5 - (BH / 2) * f, scale: f };
    const below = { ...cruise, y: H + 12 * f };

    // ── clouds (the opening's), driven by the flight's speed ──
    const clouds: Cloud[] = raster ? [] : qa<HTMLElement>(".bj-cloud").map((c, i) => {
      const d = CLOUDS[i];
      c.style.width = `${d.w * f}px`;
      c.style.height = `${d.h * f}px`;
      return { el: c, x: d.x * f, y: d.y * f, w: d.w * f, h: d.h * f, depth: d.depth, recycle: true };
    });

    // ── the checkpoint: placed by the same distance the clouds travel, at its (far) depth ──
    const prof = speedProfile();
    const total = prof.D(1) * C.climb.dur * CLIMB * f * CHECK_DEPTH;
    const checkY0 = checkEnd.y - total;
    const placeCheck = (u: number, e = prof.D(u) / prof.D(1)) => {
      const sc = (0.72 + 0.28 * Math.pow(e, 1.5)) * chk.k;
      check.style.transform = `translate3d(${checkEnd.x.toFixed(1)}px, ${(checkY0 + total * e).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    };

    const driftSpeed = 0.20;
    const driftTravel = CLIMB * f * driftSpeed;
    const climbTravel = H * 2.25 * (1 - driftSpeed);
    const arrivalTravel = climbTravel + C.climb.dur * driftTravel;
    const entrySpeed = 0.78;
    const restPose = { ...flightPose(1, f, entrySpeed), velocity: driftSpeed };
    const arrivalCycles = wingCycles(C.climb.dur, C.climb.dur, restPose.integral);
    let drift: gsap.core.Tween | null = null;
    const startDrift = () => {
      if (!environment || drift) return;
      drift = gsap.to({}, {
        duration: 1,
        repeat: -1,
        onUpdate(this: gsap.core.Tween) {
          const elapsed = this.totalTime();
          wings?.paint(arrivalCycles + elapsed * BIRD_WINGS.hoverCyclesPerSecond);
          const travel = elapsed * driftTravel;
          const phase = restPose.phase + (travel / climbTravel) * Math.PI * 3.1;
          environment.paint({ ...restPose, phase }, arrivalTravel + travel);
        },
      });
    };

    const paintRasterFlight = (u: number) => {
      if (!mascot || !environment) return;
      const pose = flightPose(u, f, entrySpeed);
      wings?.paint(wingCycles(u * C.climb.dur, C.climb.dur, pose.integral));
      const rise = smooth(pose.distance / 0.23);
      const arrival = smooth((u - 0.62) / 0.38);
      const centerY = below.y + (cruise.y - below.y) * rise;
      const scale = cruise.scale + (birdEnd.scale - cruise.scale) * arrival;
      // Move the bird's center with the camera, then apply the shared banking to the complete image.
      const x = W / 2 + pose.drift - BW * scale / 2;
      const y = (centerY + BH * cruise.scale / 2) * (1 - arrival)
        + (birdEnd.y + BH * birdEnd.scale / 2) * arrival + pose.lift - BH * scale / 2;
      gsap.set(rig, { x, y, scale });
      mascot.style.transform = `rotate(${pose.bank}deg) scale(${1 + pose.scale})`;
      placeCheck(u, pose.distance);
      const velocity = driftSpeed + pose.velocity * (1 - driftSpeed);
      const travel = pose.distance * climbTravel + u * C.climb.dur * driftTravel;
      environment.paint({ ...pose, velocity }, travel);
    };

    const lineSpan = q(".bjs-line > span");
    const actionsEl = q(".bjs-actions"); // the original ending's actions (no program only)
    // decode the banner now, so its first frame on screen costs nothing mid-animation
    if (panel) q<HTMLImageElement>(".bjs-card").decode?.().catch(() => {});
    const sky = q(".bjs-sky");
    const SETTLED = { speed: 0.2, amp: 20, trail: 0.3, beats: 0.25, pitch: -2, climb: CLIMB };
    let flight: ReturnType<typeof createFlight> | null = null;
    const fly = (state: Partial<typeof SETTLED>) => {
      flight?.stop();
      flight = createFlight({ rig, trails: q<SVGSVGElement>(".bj-air"), clouds, frame: () => ({ W, H, f }), state });
      return flight;
    };

    let hover: gsap.core.Tween | null = null;
    const final = () => {
      if (raster && !still && !drift) {
        paintRasterFlight(1);
        startDrift();
      }
      if (mascot) mascot.style.removeProperty("transform");
      chk.k = kAfter;
      placeCheck(1);
      gsap.set(rig, after ? after.bird : birdEnd);
      gsap.set(sky, { opacity: 1 });
      gsap.set([lineSpan, actionsEl].filter(Boolean), { clearProps: "transform,opacity" });
      if (raster && actionsEl) actionsEl.inert = false;
      if (slot && panel) {
        if (raster) panel.inert = false;
        gsap.set(slot, { height: panelH, marginTop: 0 });
        gsap.set(panel, { yPercent: 0, opacity: 1 });
      }
    };

    if (still) {
      final();
      clouds.forEach((c) => (c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`));
      environment?.paint(flightPose(1, f), 0);
      return;
    }

    // ── initial state: the sky under the marksheet, the bird just below the frame, already flying ──
    placeCheck(0);
    gsap.set(rig, below);
    gsap.set(sky, { opacity: 0 });
    gsap.set(lineSpan, { yPercent: 150 });
    if (actionsEl) gsap.set(actionsEl, { opacity: 0, y: 18 });
    if (panel) gsap.set(panel, { yPercent: 35, opacity: 0 });
    if (raster) {
      paintRasterFlight(0);
      if (actionsEl) actionsEl.inert = true;
      if (panel) panel.inert = true;
    } else {
      fly({ speed: 0.9, amp: 24, trail: 0.7, beats: 0.6, pitch: -4, climb: CLIMB });
    }

    const tl = gsap.timeline({ paused: raster, onComplete: () => finish() });

    // the marksheet recedes as one artifact (only when we came from it)
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
    // the sky comes up under it
    tl.to(sky, { opacity: 1, duration: C.sky.dur, ease: "sine.inOut" }, C.sky.at);
    // the bird rises into frame, mid-climb
    if (!raster) tl.to(rig, { y: cruise.y, duration: C.rise.dur, ease: "power2.out" }, C.rise.at);

    // the climb: one progress value → the speed (wingbeat, airflow, clouds) and the checkpoint
    const cl = { u: 0 };
    tl.to(cl, {
      u: 1,
      duration: C.climb.dur,
      ease: "none",
      onUpdate: () => {
        if (raster) {
          paintRasterFlight(cl.u);
        } else {
          const v = prof.v(cl.u);
          if (flight) Object.assign(flight.state, { speed: v, amp: 20 + 4 * v, trail: 0.3 + 0.45 * v, beats: 0.25 + 0.4 * v, pitch: -2 - 3 * v });
          placeCheck(cl.u);
        }
      },
      onComplete: startDrift,
    }, C.climb.at);
    // into its place below the checkpoint, a little farther in
    if (!raster) tl.to(rig, { x: birdEnd.x, y: birdEnd.y, scale: birdEnd.scale, duration: C.place.dur, ease: "power2.inOut" }, C.place.at);

    // the closing line, then the actions
    tl.to(lineSpan, { yPercent: 0, duration: C.line.dur, ease: raster ? gsapEase("refPop") : "expo.out" }, C.line.at);
    if (actionsEl) tl.to(actionsEl, { opacity: 1, y: 0, duration: C.actions.dur, ease: "power2.out" }, C.actions.at);
    // the ending is established: the flight settles into its steady beat (and it can't be skipped any more)
    const settle = () => {
      if (flight) Object.assign(flight.state, SETTLED);
      if (raster && actionsEl) actionsEl.inert = false;
      setPlaying(false);
    };
    tl.call(settle, [], C.end);
    tl.set({}, {}, C.end);

    // the next step — on the same timeline, after the ending has held (no tap)
    if (slot && panel && after) {
      const R = C.reveal;
      tl.to(slot, { height: panelH, marginTop: 0, duration: R.dur, ease: "power3.inOut" }, R.at);
      tl.to(panel, { yPercent: 0, opacity: 1, duration: R.dur, ease: "power3.out" }, R.at + 0.06);
      tl.to(rig, { ...after.bird, duration: R.dur, ease: "power3.inOut" }, R.at);
      tl.to(chk, { k: kAfter, duration: R.dur, ease: "power3.inOut", onUpdate: () => placeCheck(1) }, R.at);
      if (raster) tl.call(() => { panel.inert = false; }, [], R.at + R.dur);
      tl.set({}, {}, C.revealEnd);
    }

    const unregister = raster ? devRegister("11 3D Bird Journey", fromGsap(tl)) : () => {};
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      if (!raster) {
        tl.progress(1);
        tl.kill();
      }
      final();
      if (mascot) {
        hover?.kill();
        hover = gsap.to(mascot, {
          y: -BIRD_HOVER.amplitude,
          duration: BIRD_HOVER.period / 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      } else if (flight) {
        Object.assign(flight.state, SETTLED);
      } else {
        fly(SETTLED);
      }
      setPlaying(false);
    }
    // a tap during the flight skips to the established ending; the reveal still follows on its own
    const skip = () => {
      if (tl.time() >= C.end) return;
      tl.seek(C.end, true);
      if (raster) {
        if (!program) {
          finish();
          return;
        }
        paintRasterFlight(1);
        startDrift();
      }
      settle();
    };
    let cancelled = false;
    if (wings) {
      const play = () => { if (!cancelled) tl.play(); };
      if (wings.decoded) play();
      else void wings.ready.then(play);
    }
    const stop = () => {
      cancelled = true;
      unregister();
      tl.kill();
      hover?.kill();
      drift?.kill();
      drift = null;
      flight?.stop();
    };
    ctl.current = {
      stop: () => { stop(); restoreMarksheet(); },
      finish: () => {
        if (raster && done) {
          done = false;
          finish();
        } else {
          finish();
        }
      },
      skip,
    };
    return () => {
      stop();
      if (raster) restoreMarksheet();
    };
    // the entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raster, still]);

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
    <div ref={root} className={`slide bj bjc bjs${raster ? " bjs-3d" : ""}`}>
      <p className="bjw-sr">{COPY.close.prdLine}</p>
      <div className="bjs-sky" aria-hidden="true">
        <div className="bj-clouds">
          {CLOUDS.map((c, i) => (
            <div key={i} className="bj-cloud">
              <img src={`/assets/journey/${c.src}.svg`} alt="" />
            </div>
          ))}
        </div>
        <div className="bjs-check">
          <SkyCheckpoint year="২০২৭" />
        </div>
      </div>
      {raster ? (
        <>
          <Bird3DWind />
          <div className="bj-rig b3-rig" aria-hidden="true"><Bird3DImage key={String(still)} still={still} /></div>
        </>
      ) : (
        <>
          <svg className="bj-air" aria-hidden="true"><path /><path /><path /></svg>
          <BirdRig />
        </>
      )}
      <div className="bjs-copy">
        <h1 className="bjs-line" aria-hidden="true">
          <span>{keepTogether(COPY.close.prdLine, "২০২৭-এ")}</span>
        </h1>
        {program ? (
          // the next step: the program's own banner (whole) and its action, one panel, part of the screen
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
          <div className="bjs-actions">
            <div className="actions">
              <Button kind="primary" onClick={actions.exitToHome}>
                {COPY.close.primary}
              </Button>
              <Button kind="secondary" onClick={() => actions.share("marksheet")}>
                {COPY.close.secondary}
              </Button>
            </div>
          </div>
        )}
      </div>
      {playing && (!raster || !still) && <button type="button" className="bj-skip" aria-label="এগিয়ে যাও" onClick={() => ctl.current?.skip()} />}
    </div>
  );
}
