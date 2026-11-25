import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import { PROFILES, getProfile } from "../data/profiles";
import { composeStory, type Slide } from "../data/compose";
import { TEACHER_SLIDE_ENABLED_DEFAULT } from "../data/config";
import { CATEGORIES } from "../motion/categories";
import { AMBIENT, type AmbientLoop } from "../motion/ambient";
import {
  BIRD_LED_MOTION,
  BIRD_MOTION,
  SCREEN_MOTION,
  type PhaseMarkers,
  type ScreenMotion,
  type TargetMarkers,
} from "../motion/screens";
import { hasRefined } from "../motion/versions";
import type { FrameApi } from "./frameBoot";
import type { Observation, ObserveOptions } from "./observe";
import "./inspector.css";

/**
 * Motion Inspector (development only; `?view=motion`).
 *
 * The preview is the real prototype in an iframe (`?motionFrame=1`), driven by
 * the frame's virtual clock (clock.ts): every animation library in the frame
 * follows one time source, so play / pause / speed / seek act on all of them and
 * on nothing outside the frame. Replay and backward seeks reload the frame and
 * fast-forward deterministically from its first frame. Timing data comes from
 * motion/screens.ts (code-derived and audit-measured), the category budgets
 * (targets) and a live observation of this run (observe.ts).
 */

type Mode = "screen" | "transition" | "journey";
type SlideId = Slide["id"];
type Journey = "current" | "bird" | "birdled";

interface Entry {
  key: string;
  label: string;
  slide: SlideId;
  journey: Journey;
  group: "Original" | "Bird Journey" | "Bird-led" | "Variants";
  meta: ScreenMotion | null;
  params?: string;
}

const ORDER: SlideId[] = [
  "cover",
  "study",
  "live",
  "teacher",
  "quiz",
  "video",
  "subject",
  "peakDay",
  "learnerType",
  "marksheet",
  "close",
];
const ORIGINAL: Entry[] = ORDER.map((id) => ({
  key: id,
  label: SCREEN_MOTION[id].label,
  slide: id,
  journey: "current",
  group: "Original",
  meta: SCREEN_MOTION[id],
}));
const BIRD: Entry[] = [
  {
    key: "bird-cover",
    label: BIRD_MOTION.cover.label,
    slide: "cover",
    journey: "bird",
    group: "Bird Journey",
    meta: BIRD_MOTION.cover,
  },
  {
    key: "bird-close",
    label: BIRD_MOTION.close.label,
    slide: "close",
    journey: "bird",
    group: "Bird Journey",
    meta: BIRD_MOTION.close,
  },
];
/** Bird-led Storytelling (version 2): its own screens so far; every other screen is the original. */
const BIRD_LED: Entry[] = [
  { key: "birdled-study", label: BIRD_LED_MOTION.study.label, slide: "study", journey: "birdled", group: "Bird-led", meta: BIRD_LED_MOTION.study },
];
const v = (
  key: string,
  label: string,
  slide: SlideId,
  params: string,
): Entry => ({
  key,
  label,
  slide,
  journey: "current",
  group: "Variants",
  meta: null,
  params,
});
const VARIANTS: Entry[] = [
  v("cover-m3", "01 Cover · M3 geometry", "cover", "cover=m3"),
  v("cover-m2", "01 Cover · M2", "cover", "cover=m2"),
  v("cover-u", "01 Cover · Unfolded", "cover", "cover=u"),
  v("cover-a", "01 Cover · A Typographic", "cover", "cover=a"),
  v("cover-b", "01 Cover · B Geometry", "cover", "cover=b"),
  v("cover-c", "01 Cover · C Editorial", "cover", "cover=c"),
  v("study-geo", "02 Study · M3 count-up", "study", "study=geo"),
  v("live-v2", "03 Live · V2 attendance", "live", "live=v2"),
  v("teacher-v2", "04 Teacher · M1", "teacher", "teacher=v2"),
  v("quiz-v2", "05 Quiz · V2", "quiz", "quiz=v2"),
  v("video-v2", "06 Video · V2", "video", "video=v2"),
  v("subject-v2", "07 Subject · M1", "subject", "subject=v2"),
  v("peak-v2", "08 Peak day · M1", "peakDay", "peak=v2"),
  v("learner-v2", "09 Learner · M1 stamp", "learnerType", "learner=v2"),
  v("ms-m1", "10 Marksheet · M1 sheet", "marksheet", "marksheet=v2"),
  v("ms-v2a", "10 Marksheet · V2-A Bold", "marksheet", "ms=v2a"),
  v("ms-v2b", "10 Marksheet · V2-B Editorial", "marksheet", "ms=v2b"),
];
const ENTRIES = [...ORIGINAL, ...BIRD, ...BIRD_LED, ...VARIANTS];

/** The personalised result on each screen (the live hero marker); the same elements the audit probe used. */
function heroSel(
  slide: SlideId,
  journey: Journey,
  params?: string,
): string | null {
  if (params) return null;
  const bird = journey === "bird" || journey === "birdled";
  const m: Partial<Record<SlideId, string>> = {
    cover: bird ? ".bj-head > span" : ".cf-head > span",
    study: ".sc-num",
    live: ".fr-num-mask > span",
    teacher: ".tc-name > span",
    quiz: ".qa-num",
    video: ".vw-num",
    subject: ".sb-name",
    peakDay: ".pd-day",
    learnerType: ".lt-type",
    // the second assembly group (the paired chapters) landing: the card is readable
    marksheet: '.bt-slot[data-row="pair"] > .bt',
    close: bird ? ".bjs-line > span" : ".yt-wheel",
  };
  return m[slide] ?? null;
}
const offerAt = (slide: SlideId, journey: Journey, program: boolean) =>
  slide === "close" && program
    ? ((journey === "bird"
        ? BIRD_MOTION.close.code.offerStartAt
        : SCREEN_MOTION.close.code.offerStartAt) ?? null)
    : null;

const VIEWPORTS = {
  "360": { w: 360, h: 800 },
  "390": { w: 390, h: 844 },
  "430": { w: 430, h: 932 },
} as const;
type ViewportId = keyof typeof VIEWPORTS;
const SPEEDS = [0.25, 0.5, 1, 2] as const;
const HOLD = 1.5; // Full journey, automatic playback: rest after a screen settles (QA only)

const fmt = (x: number | null | undefined) =>
  x == null || !Number.isFinite(x) ? "—" : `${x.toFixed(2)} s`;

export default function MotionInspector() {
  const [mode, setMode] = useState<Mode>("transition");
  const [entryKey, setEntryKey] = useState("live");
  const [journeyC, setJourneyC] = useState<Journey>("current");
  const [viewport, setViewport] = useState<ViewportId>("390");
  const [profileId, setProfileId] = useState("high");
  const [reduced, setReduced] = useState(false);
  const [noProgram, setNoProgram] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [auto, setAuto] = useState(false);

  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [obs, setObs] = useState<Observation | null>(null);
  const [label, setLabel] = useState("");
  const [timelines, setTimelines] = useState<
    { label: string; source: string; duration: number; time: number }[]
  >([]);
  const [busy, setBusy] = useState(false);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<FrameApi | null>(null);
  const runRef = useRef(0);
  const loadWait = useRef<(() => void) | null>(null);

  const entry = ENTRIES.find((e) => e.key === entryKey) ?? ORIGINAL[2];
  const profile = getProfile(profileId);
  const hasProgram = !!profile.record.nextProgram && !noProgram;
  const plan = useMemo(
    () =>
      composeStory(
        noProgram
          ? { ...profile.record, nextProgram: undefined }
          : profile.record,
        { teacherSlideEnabled: TEACHER_SLIDE_ENABLED_DEFAULT },
      ),
    [profile, noProgram],
  );
  const journey: Journey = mode === "journey" ? journeyC : entry.journey;
  const deckIndex = plan.slides.findIndex((s) => s.id === entry.slide);
  const inDeck = deckIndex >= 0;
  const meta: ScreenMotion | null = mode === "journey" ? null : entry.meta;

  // ── frame URL for a run ──
  const frameUrl = useCallback(
    (start: string | null) => {
      const q = new URLSearchParams({
        motionFrame: "1",
        p: profileId,
        journey,
        motion: "original",
        n: String(Date.now()),
      });
      if (start) q.set("start", start);
      if (reduced) q.set("rm", "1");
      if (noProgram) q.set("noProgram", "1");
      if (mode !== "journey" && entry.params)
        for (const [k, val] of new URLSearchParams(entry.params)) q.set(k, val);
      return `/?${q.toString()}`;
    },
    [profileId, journey, reduced, noProgram, mode, entry.params],
  );

  /** (Re)load the frame and bring it to `target` seconds after this mode's origin; optionally play on. */
  const run = useCallback(
    async (target = 0, play = true) => {
      const id = ++runRef.current;
      apiRef.current = null; // stop polling the frame that is about to be replaced
      setBusy(true);
      setObs(null);
      const start =
        mode === "screen"
          ? entry.slide
          : mode === "transition"
            ? deckIndex > 0
              ? plan.slides[deckIndex - 1].id
              : null
            : null;
      setStatus(
        mode === "journey"
          ? "Full journey"
          : !inDeck
            ? "Not in this student's deck"
            : "Loading…",
      );
      if (mode !== "journey" && !inDeck) {
        setBusy(false);
        return;
      }
      const loaded = new Promise<void>((res) => (loadWait.current = res));
      setSrc(frameUrl(start));
      await loaded;
      if (id !== runRef.current) return;
      const api = (
        frameRef.current?.contentWindow as unknown as {
          __wrapInspector?: FrameApi;
        } | null
      )?.__wrapInspector;
      if (!api) {
        setStatus("The preview frame did not start (is this the dev server?)");
        setBusy(false);
        return;
      }
      await api.ready;
      if (id !== runRef.current) return;
      apiRef.current = api;
      api.clock.setSpeed(speed);
      const opts: ObserveOptions = {
        heroSel: heroSel(entry.slide, journey, entry.params),
        offerAt: offerAt(entry.slide, journey, hasProgram),
      };
      if (mode === "screen") {
        api.observe(opts);
      } else if (mode === "transition") {
        if (deckIndex > 0) {
          // the previous screen, settled, before the tap
          const prev = plan.slides[deckIndex - 1].id;
          const pm: ScreenMotion = SCREEN_MOTION[prev];
          const pre = Math.max(
            2.5,
            (pm.code.offerSettleAt ?? pm.code.settleAt ?? 4) + 0.8,
          );
          setStatus(`Settling ${pm.label}…`);
          await api.clock.advance(pre);
          if (id !== runRef.current) return;
          api.observe(opts);
          api.next();
        } else {
          api.observe(opts);
          api.openStory();
        }
      } else {
        const map: Record<string, ObserveOptions> = {};
        plan.slides.forEach((s) => {
          const no = SCREEN_MOTION[s.id].label.slice(0, 2);
          map[no] = {
            heroSel: heroSel(s.id, journeyC),
            offerAt: offerAt(s.id, journeyC, hasProgram),
          };
        });
        api.follow(map);
      }
      if (target > 0) {
        setStatus(`Seeking to ${target.toFixed(2)} s…`);
        await api.clock.advance(target);
      }
      if (id !== runRef.current) return;
      setStatus(
        mode === "transition"
          ? "Hand-over from the settled previous screen"
          : mode === "screen"
            ? "Stand-alone entrance"
            : "Full journey",
      );
      if (play) api.clock.play();
      setBusy(false);
    },
    [
      mode,
      entry,
      deckIndex,
      plan,
      inDeck,
      frameUrl,
      speed,
      journey,
      journeyC,
      hasProgram,
    ],
  );

  // re-run whenever what is inspected changes
  useEffect(() => {
    void run(0, mode !== "journey");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entryKey, journeyC, viewport, profileId, reduced, noProgram]);

  // poll the frame (real time; the frame keeps its own clock)
  useEffect(() => {
    let alive = true;
    let tick = 0;
    const loop = window.setInterval(async () => {
      const api = apiRef.current;
      if (!api || !alive) return;
      try {
        setTime(api.time());
        setPlaying(api.clock.playing);
        setLabel(api.label());
        const r = api.result();
        setObs(r);
        if (++tick % 6 === 0) setTimelines(await api.timelines());
        // Full journey, automatic playback (QA only): after a screen settles and rests, step on
        if (
          mode === "journey" &&
          auto &&
          api.clock.playing &&
          r &&
          r.stable &&
          r.settleAt != null &&
          r.observedTo >= Math.max(r.settleAt, r.offerSettleAt ?? 0) + HOLD
        ) {
          const l = api.label();
          if (l === "home") api.openStory();
          else if (!/(\d+) \/ \1$/.test(l)) api.next();
        }
      } catch {
        /* the frame is being replaced (replay / backward seek) */
      }
    }, 80);
    return () => {
      alive = false;
      clearInterval(loop);
    };
  }, [mode, auto]);

  // ── transport ──
  const api = () => apiRef.current;
  const pause = () => {
    api()?.clock.pause();
    setPlaying(false);
  };
  const play = () => {
    api()?.clock.play();
    setPlaying(true);
  };
  const seek = async (t: number) => {
    const a = api();
    if (!a) return;
    const was = a.clock.playing;
    t = Math.max(0, t);
    if (t >= a.time() - 1e-3) {
      a.clock.pause();
      setBusy(true);
      await a.clock.advance(t - a.time());
      setBusy(false);
      if (was) a.clock.play();
    } else {
      await run(t, false); // backward: a fresh frame, fast-forwarded from its first frame
    }
  };
  const changeSpeed = (s: number) => {
    setSpeed(s);
    api()?.clock.setSpeed(s);
  };
  const stepScreen = (d: number) => {
    if (mode === "journey") {
      if (d > 0) {
        if (api()?.label() === "home") api()?.openStory();
        else api()?.next();
      } else api()?.prev();
      return;
    }
    const list =
      entry.group === "Variants"
        ? VARIANTS
        : entry.group === "Bird Journey"
          ? BIRD
          : entry.group === "Bird-led"
            ? BIRD_LED
            : ORIGINAL;
    const i = list.findIndex((e) => e.key === entry.key);
    const n = list[Math.max(0, Math.min(list.length - 1, i + d))];
    setEntryKey(n.key);
  };

  // ── markers ──
  const code = meta?.code;
  const measured = meta?.measured;
  const target = meta?.target;
  const closing = entry.slide === "close" && mode !== "journey";
  const showOffer = closing && hasProgram;
  const jump = (k: keyof PhaseMarkers) =>
    code?.[k] ??
    measured?.[k] ??
    (obs ? (obs as unknown as Record<string, number | null>)[k] : null);
  const span =
    Math.max(
      3,
      ...[code, measured].flatMap((m) =>
        m
          ? [
              m.settleAt,
              showOffer ? m.offerSettleAt : null,
              m.conceptEndAt,
            ].map((x) => x ?? 0)
          : [],
      ),
      obs?.settleAt ?? 0,
      showOffer ? (obs?.offerSettleAt ?? 0) : 0,
    ) + 1.5;
  // Screen / transition: playback stops at the end of the inspected span (ambient loops would run forever)
  useEffect(() => {
    if (mode !== "journey" && playing && time >= span) pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, span, playing, mode]);

  // ── preview scale ──
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const vp = VIEWPORTS[viewport];
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(1, (r.width - 32) / vp.w, (r.height - 48) / vp.h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vp]);

  const cat = meta ? CATEGORIES[meta.category] : null;
  const ambientMeta = (meta?.ambientLoops ?? []) as AmbientLoop[];

  return (
    <div className="mi">
      <aside className="mi-side" aria-label="Screens">
        <div className="mi-brand">
          <span>Motion Inspector</span>
          <span className="mi-tag">Dev</span>
        </div>
        <div className="mi-seg" role="radiogroup" aria-label="Inspection mode">
          {(
            [
              ["screen", "A · Screen"],
              ["transition", "B · Transition"],
              ["journey", "C · Journey"],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              className={mode === id ? "is-on" : ""}
              onClick={() => setMode(id)}
            >
              {name}
            </button>
          ))}
        </div>
        {mode === "journey" ? (
          <div className="mi-group">
            <h3>Version</h3>
            <div
              className="mi-seg"
              role="radiogroup"
              aria-label="Journey version"
            >
              {(["current", "bird", "birdled"] as const).map((j) => (
                <button
                  key={j}
                  type="button"
                  role="radio"
                  aria-checked={journeyC === j}
                  className={journeyC === j ? "is-on" : ""}
                  onClick={() => setJourneyC(j)}
                >
                  {j === "current" ? "Original" : j === "bird" ? "Bird Journey" : "Bird-led"}
                </button>
              ))}
            </div>
            <ol className="mi-deck">
              {plan.slides.map((s, i) => (
                <li
                  key={s.id}
                  className={
                    label.startsWith(SCREEN_MOTION[s.id].label.slice(0, 2)) &&
                    label !== "home"
                      ? "is-on"
                      : ""
                  }
                >
                  <span>{i + 1}</span>{" "}
                  {SCREEN_MOTION[s.id].label.replace(/^\d+ /, "")}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          (["Original", "Bird Journey", "Bird-led", "Variants"] as const).map((g) => (
            <div key={g} className="mi-group">
              <h3>{g}</h3>
              <ul className="mi-list">
                {ENTRIES.filter((e) => e.group === g).map((e) => {
                  const off = !plan.slides.some((s) => s.id === e.slide);
                  return (
                    <li key={e.key}>
                      <button
                        type="button"
                        className={`mi-item ${e.key === entryKey ? "is-on" : ""} ${off ? "is-off" : ""}`}
                        onClick={() => setEntryKey(e.key)}
                        title={
                          off
                            ? "Not in this student's deck"
                            : e.params
                              ? `?${e.params}`
                              : undefined
                        }
                      >
                        <span className="mi-item-name">{e.label}</span>
                        {e.meta ? (
                          <span className={`mi-cat mi-cat-${e.meta.category}`}>
                            {e.meta.category}
                          </span>
                        ) : (
                          <span className="mi-cat mi-cat-x">live</span>
                        )}
                        {e.meta && "reference" in e.meta && e.meta.reference ? (
                          <span
                            className="mi-ref"
                            title="Motion reference screen"
                          >
                            ref
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </aside>

      <section className="mi-main">
        <header className="mi-bar">
          <div className="mi-field">
            <label htmlFor="mi-profile">Student</label>
            <select
              id="mi-profile"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mi-field">
            <span>Viewport</span>
            <div
              className="mi-seg mi-seg-sm"
              role="radiogroup"
              aria-label="Viewport"
            >
              {(Object.keys(VIEWPORTS) as ViewportId[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={viewport === k}
                  className={viewport === k ? "is-on" : ""}
                  onClick={() => setViewport(k)}
                >
                  {VIEWPORTS[k].w}×{VIEWPORTS[k].h}
                </button>
              ))}
            </div>
          </div>
          <label className="mi-check">
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />{" "}
            Reduced motion
          </label>
          <label
            className={`mi-check ${profile.record.nextProgram ? "" : "is-dis"}`}
            title={
              profile.record.nextProgram
                ? ""
                : "This student has no recommended program"
            }
          >
            <input
              type="checkbox"
              checked={hasProgram}
              disabled={!profile.record.nextProgram}
              onChange={(e) => setNoProgram(!e.target.checked)}
            />{" "}
            Eligible next program
          </label>
          <div className="mi-field">
            <span>Motion</span>
            <div
              className="mi-seg mi-seg-sm"
              role="radiogroup"
              aria-label="Motion version"
            >
              <button type="button" role="radio" aria-checked className="is-on">
                Original
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={false}
                disabled
                title={
                  hasRefined(entry.slide)
                    ? ""
                    : "Refined motion is not implemented for this screen yet"
                }
              >
                Refined · n/a
              </button>
            </div>
          </div>
        </header>

        <div className="mi-work">
          <div className="mi-stage" ref={stageRef}>
            <div
              className="mi-phone"
              style={{ width: vp.w * scale, height: vp.h * scale }}
            >
              {src && (
                <iframe
                  ref={frameRef}
                  key={src}
                  src={src}
                  title="Wrap preview"
                  style={{
                    width: vp.w,
                    height: vp.h,
                    transform: `scale(${scale})`,
                  }}
                  onLoad={() => loadWait.current?.()}
                />
              )}
            </div>
            <p className="mi-status">
              {status}
              {mode === "journey" && label
                ? ` · ${label === "home" ? "Home banner" : label}`
                : ""}
            </p>
          </div>

          <aside className="mi-panel" aria-label="Timing">
            {mode === "journey" ? (
              <JourneyPanel obs={obs} label={label} />
            ) : (
              <>
                <h2>{entry.label}</h2>
                {cat && meta ? (
                  <p className="mi-sub">
                    <strong>{meta.category}</strong> {cat.name} · {meta.library}
                    {"reference" in meta && meta.reference
                      ? " · motion reference"
                      : ""}
                  </p>
                ) : (
                  <p className="mi-sub">
                    No metadata for this variant: live values only.
                  </p>
                )}
                {mode === "screen" && meta && (
                  <p className="mi-note">
                    Code and measured values describe the forward hand-over
                    (Mode B). Mode A is the stand-alone entrance; compare with
                    the live column.
                  </p>
                )}
                <MarkerTable
                  code={code}
                  measured={measured}
                  target={target}
                  live={obs}
                  study={entry.slide === "study" && !entry.params}
                  closing={closing}
                  offer={showOffer}
                />
                <div className="mi-block">
                  <h3>Budget</h3>
                  {cat ? (
                    <p>
                      {cat.hero
                        ? `Hero ${cat.hero[0]}–${cat.hero[1]} s · `
                        : ""}
                      {entry.slide === "quiz"
                        ? "Quiz: hero ≈ 2.6 s, settle ≤ 3.0 s"
                        : cat.settle
                          ? `settle ≤ ${cat.settle} s`
                          : "own cinematic length"}
                      <br />
                      <span className="mi-dim">
                        Targets for refinement; nothing is retimed yet.
                      </span>
                    </p>
                  ) : (
                    <p className="mi-dim">—</p>
                  )}
                </div>
                <div className="mi-block">
                  <h3>Ambient</h3>
                  {ambientMeta.length ? (
                    <ul className="mi-amb">
                      {ambientMeta.map((a) => (
                        <li key={a}>
                          <span className="mi-dot" /> {a}{" "}
                          <span className="mi-dim">· {AMBIENT[a].where}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mi-dim">—</p>
                  )}
                  <p className="mi-dim">
                    Live loops (still moving after the entrance):{" "}
                    {obs?.ambient.length
                      ? obs.ambient.join(", ")
                      : "none detected"}
                  </p>
                </div>
                <div className="mi-block">
                  <h3>Registered timelines</h3>
                  {timelines.length ? (
                    <ul className="mi-tl">
                      {timelines.map((t, i) => (
                        <li key={i}>
                          {t.label}{" "}
                          <span className="mi-dim">
                            · {t.source} · {t.time.toFixed(2)} /{" "}
                            {Number.isFinite(t.duration)
                              ? t.duration.toFixed(2)
                              : "?"}{" "}
                            s
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mi-dim">
                      None on this screen (driven by the virtual clock only;
                      adapters registered on 03, 06, 08, 11).
                    </p>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>

        <footer className="mi-transport">
          <div className="mi-controls">
            <button
              type="button"
              onClick={() => stepScreen(-1)}
              title="Previous screen"
              aria-label="Previous screen"
            >
              ‹
            </button>
            {playing ? (
              <button
                type="button"
                className="mi-primary"
                onClick={pause}
                disabled={busy}
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                className="mi-primary"
                onClick={play}
                disabled={busy}
              >
                {time > 0 ? "Resume" : "Play"}
              </button>
            )}
            <button type="button" onClick={() => run(0, true)} disabled={busy}>
              Replay
            </button>
            <button
              type="button"
              onClick={() => stepScreen(1)}
              title="Next screen"
              aria-label="Next screen"
            >
              ›
            </button>
            {mode !== "journey" && (
              <>
                <span className="mi-sep" />
                <button
                  type="button"
                  onClick={() => seek(jump("heroAt") ?? 0)}
                  disabled={busy || jump("heroAt") == null}
                >
                  Hero
                </button>
                <button
                  type="button"
                  onClick={() => seek(jump("copyAt") ?? 0)}
                  disabled={busy || jump("copyAt") == null}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    seek(
                      (showOffer ? jump("offerSettleAt") : null) ??
                        jump("settleAt") ??
                        0,
                    )
                  }
                  disabled={busy}
                >
                  Settled
                </button>
              </>
            )}
            {mode === "journey" && (
              <label className="mi-check">
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />{" "}
                Auto-advance (QA: settle + {HOLD} s)
              </label>
            )}
            <span className="mi-sep" />
            <div
              className="mi-seg mi-seg-sm"
              role="radiogroup"
              aria-label="Playback speed"
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={speed === s}
                  className={speed === s ? "is-on" : ""}
                  onClick={() => changeSpeed(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
            <span className="mi-time">{time.toFixed(2)} s</span>
          </div>
          {mode !== "journey" ? (
            <Timeline
              span={span}
              time={time}
              code={code}
              measured={measured}
              target={target}
              live={obs}
              closing={closing}
              offer={showOffer}
              study={entry.slide === "study" && !entry.params}
              ambient={ambientMeta.length > 0 || !!obs?.ambient.length}
              onSeek={seek}
              busy={busy}
            />
          ) : (
            <p className="mi-dim mi-journey-note">
              The timeline restarts at every screen change (t = 0 at the tap).
              Navigation here uses the story's own keys; QA auto-advance is
              separate from the product's timer.
            </p>
          )}
        </footer>
      </section>
    </div>
  );
}

function MarkerTable({
  code,
  measured,
  target,
  live,
  study,
  closing,
  offer,
}: {
  code?: PhaseMarkers;
  measured?: PhaseMarkers;
  target?: TargetMarkers;
  live: Observation | null;
  study: boolean;
  closing: boolean;
  offer: boolean;
}) {
  const t = (x: unknown) =>
    x === "keep"
      ? "keep"
      : x === "copySettle+1.2"
        ? "copy +1.2 s"
        : x === "copySettle+1.95"
          ? "copy +1.95 s"
          : Array.isArray(x)
            ? `${x[0]}–${x[1]} s`
            : typeof x === "number"
              ? `${x.toFixed(2)} s`
              : "—";
  const rows: [string, keyof PhaseMarkers | "offerStartAt", boolean][] = [
    ["Hand-over end", "handoverEnd", true],
    ["Hero readable", "heroAt", true],
    [closing ? "Copy complete" : "Copy complete", "copyAt", true],
    [closing ? "Emotional ending" : "Settled", "settleAt", true],
    ["Clock spin lands", "conceptEndAt", study],
    ["Recommendation starts", "offerStartAt", offer],
    ["Recommendation settled", "offerSettleAt", offer],
  ];
  const liveOf = (k: string) => {
    if (!live || k === "offerStartAt") return null;
    // 02: the observed settle is the clock landing (the concept); the screen's own settle is its copy
    if (study && k === "conceptEndAt") return live.settleAt;
    if (study && k === "settleAt") return live.copyAt;
    return (live as unknown as Record<string, number | null>)[k];
  };
  return (
    <table className="mi-table">
      <thead>
        <tr>
          <th />
          <th title="From the timing constants the screen runs today">Code</th>
          <th title="Motion Audit, 25 Nov 2026">Measured</th>
          <th title="Motion Design System V1 budget (not active)">Target</th>
          <th title="Observed in this run">Live</th>
        </tr>
      </thead>
      <tbody>
        {rows
          .filter((r) => r[2])
          .map(([name, k]) => (
            <tr key={k}>
              <th>{name}</th>
              <td>{fmt(code?.[k as keyof PhaseMarkers] as number | null)}</td>
              <td>
                {fmt(measured?.[k as keyof PhaseMarkers] as number | null)}
              </td>
              <td>{t(target?.[k as keyof TargetMarkers])}</td>
              <td className="mi-live">{fmt(liveOf(k))}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function JourneyPanel({
  obs,
  label,
}: {
  obs: Observation | null;
  label: string;
}) {
  return (
    <>
      <h2>
        {label === "home" || !label ? "Home banner" : label.split(" — ")[0]}
      </h2>
      <p className="mi-sub">
        Live values for the current screen, from the tap that brought it in.
      </p>
      <table className="mi-table">
        <tbody>
          {(
            [
              ["Hand-over end", obs?.handoverEnd],
              ["Hero readable", obs?.heroAt],
              ["Copy complete", obs?.copyAt],
              ["Settled", obs?.settleAt],
              ["With recommendation", obs?.offerSettleAt],
            ] as const
          ).map(([n, x]) => (
            <tr key={n}>
              <th>{n}</th>
              <td className="mi-live">{fmt(x)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mi-dim">{obs?.stable ? "Settled." : "Still moving…"}</p>
    </>
  );
}

function Timeline(p: {
  span: number;
  time: number;
  code?: PhaseMarkers;
  measured?: PhaseMarkers;
  target?: TargetMarkers;
  live: Observation | null;
  closing: boolean;
  offer: boolean;
  study: boolean;
  ambient: boolean;
  busy: boolean;
  onSeek: (t: number) => void;
}) {
  const { span } = p;
  const pct = (t: number) => `${Math.max(0, Math.min(100, (t / span) * 100))}%`;
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const dragRef = useRef(false);
  const at = (e: RPointerEvent) => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(span, ((e.clientX - r.left) / r.width) * span));
  };
  const head = drag ?? p.time;
  const mk = (m: PhaseMarkers | undefined | null, k: keyof PhaseMarkers) =>
    m ? ((m[k] as number | null | undefined) ?? null) : null;
  const marks = (
    m: PhaseMarkers | Observation | null | undefined,
    cls: string,
  ) => {
    if (!m) return null;
    const x = m as PhaseMarkers;
    const list: [string, number | null][] = [
      ["Hand-over", mk(x, "handoverEnd")],
      ["Hero", mk(x, "heroAt")],
      ["Copy", mk(x, "copyAt")],
      [p.closing ? "Emotional ending" : "Settled", mk(x, "settleAt")],
    ];
    if (p.study) list.push(["Clock lands", mk(x, "conceptEndAt")]);
    if (p.offer) list.push(["Recommendation settled", mk(x, "offerSettleAt")]);
    return list
      .filter(([, t]) => t != null)
      .map(([n, t]) => (
        <span
          key={n}
          className={`mi-mk ${cls} mi-mk-${n.split(" ")[0].toLowerCase()}`}
          style={{ left: pct(t!) }}
          title={`${n}: ${t!.toFixed(2)} s`}
        />
      ));
  };
  const tgt = p.target;
  const heroBand =
    tgt && Array.isArray(tgt.heroAt)
      ? tgt.heroAt
      : typeof tgt?.heroAt === "number"
        ? [tgt.heroAt - 0.05, tgt.heroAt + 0.05]
        : null;
  const offerStart = p.offer ? (p.code?.offerStartAt ?? null) : null;
  const offerEnd = p.offer ? (p.code?.offerSettleAt ?? null) : null;
  const emo = p.code?.settleAt ?? null;
  const ticks = Array.from({ length: Math.floor(span) + 1 }, (_, i) => i);
  return (
    <div className="mi-timeline">
      <div className="mi-rows">
        <div className="mi-row-label">Phases</div>
        <div className="mi-row-label">Code</div>
        <div className="mi-row-label">Measured</div>
        <div className="mi-row-label">Target</div>
        <div className="mi-row-label">Live</div>
        <div className="mi-row-label">Ambient</div>
      </div>
      <div
        className={`mi-track ${p.busy ? "is-busy" : ""}`}
        ref={trackRef}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          dragRef.current = true;
          setDrag(at(e));
        }}
        onPointerMove={(e) => dragRef.current && setDrag(at(e))}
        onPointerUp={(e) => {
          // a ref, not the state: a press and release in the same instant still seeks
          if (!dragRef.current) return;
          dragRef.current = false;
          const t = at(e);
          setDrag(null);
          p.onSeek(t);
        }}
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={span}
        aria-valuenow={Number(head.toFixed(2))}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") p.onSeek(p.time + 0.1);
          if (e.key === "ArrowLeft") p.onSeek(p.time - 0.1);
        }}
      >
        <div className="mi-lane mi-lane-phases">
          <span
            className="mi-band mi-band-handover"
            style={{
              left: 0,
              width: pct(p.code?.handoverEnd ?? p.measured?.handoverEnd ?? 0),
            }}
            title="Transition start → hand-over complete"
          />
          {p.code?.heroAt != null && (
            <span
              className="mi-band mi-band-concept"
              style={{
                left: pct(p.code.handoverEnd ?? 0),
                width: pct(
                  Math.max(0, p.code.heroAt - (p.code.handoverEnd ?? 0)),
                ),
              }}
              title="Main concept animation → hero"
            />
          )}
          {p.code?.heroAt != null && (
            <span
              className="mi-band mi-band-support"
              style={{
                left: pct(p.code.heroAt),
                width: pct(
                  Math.max(0.03, (emo ?? p.code.heroAt) - p.code.heroAt),
                ),
              }}
              title="Supporting content → settled"
            />
          )}
          {offerStart != null && emo != null && (
            <span
              className="mi-band mi-band-hold"
              style={{ left: pct(emo), width: pct(offerStart - emo) }}
              title="Recommendation hold"
            />
          )}
          {offerStart != null && offerEnd != null && (
            <span
              className="mi-band mi-band-offer"
              style={{
                left: pct(offerStart),
                width: pct(offerEnd - offerStart),
              }}
              title="Course banner reveal; the CTA arrives with the panel (one action set, no label change)"
            />
          )}
        </div>
        <div className="mi-lane">{marks(p.code, "is-code")}</div>
        <div className="mi-lane">{marks(p.measured, "is-measured")}</div>
        <div className="mi-lane">
          {heroBand && (
            <span
              className="mi-band mi-band-target"
              style={{
                left: pct(heroBand[0]),
                width: pct(heroBand[1] - heroBand[0]),
              }}
              title={`Target hero ${heroBand[0]}–${heroBand[1]} s`}
            />
          )}
          {typeof tgt?.settleAt === "number" && (
            <span
              className="mi-mk is-target"
              style={{ left: pct(tgt.settleAt) }}
              title={`Target settle ≤ ${tgt.settleAt} s`}
            />
          )}
          {tgt?.heroAt === "keep" && (
            <span className="mi-keep">reference: keep</span>
          )}
        </div>
        <div className="mi-lane">
          {marks(
            p.live && p.study
              ? // 02: the observed settle is the clock landing; the screen's settle is its copy
                { ...(p.live as unknown as PhaseMarkers), settleAt: p.live.copyAt, conceptEndAt: p.live.settleAt }
              : (p.live as unknown as PhaseMarkers),
            "is-live",
          )}
        </div>
        <div className="mi-lane">
          {p.ambient && (
            <span
              className="mi-band mi-band-ambient"
              style={{
                left: pct(
                  (p.live?.settleAt ?? p.code?.settleAt ?? 0) as number,
                ),
                right: 0,
              }}
              title="Ambient loops (not part of the finite entrance)"
            />
          )}
        </div>
        <div className="mi-ticks">
          {ticks.map((t) => (
            <span key={t} style={{ left: pct(t) }}>
              {t}s
            </span>
          ))}
        </div>
        <div className="mi-head" style={{ left: pct(head) }}>
          <span>{head.toFixed(2)}</span>
        </div>
      </div>
      <div className="mi-legend">
        <span>
          <i className="mi-lg is-code" /> code
        </span>
        <span>
          <i className="mi-lg is-measured" /> measured (audit)
        </span>
        <span>
          <i className="mi-lg is-target" /> target (not active)
        </span>
        <span>
          <i className="mi-lg is-live" /> live (this run)
        </span>
        <span className="mi-dim">
          Markers left → right: hand-over, hero, copy, settled
          {p.study ? ", clock lands" : ""}
          {p.offer ? ", recommendation settled" : ""}. Drag the playhead to
          seek.
        </span>
      </div>
    </div>
  );
}
