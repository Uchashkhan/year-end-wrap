import { JourneyCtx, journeyFromUrl } from "./journey/journeyMode";
import { JourneyLab } from "./journey/JourneyLab";
import { BentoLab } from "./marksheet/BentoLab";
import { MarksheetLab } from "./marksheet/MarksheetLab";
import { MarksheetDesignCtx, marksheetDesignFromUrl } from "./marksheet/design";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { composeStory } from "./data/compose";
import { getProfile } from "./data/profiles";
import { TEACHER_SLIDE_ENABLED_DEFAULT } from "./data/config";
import { PrefsProvider } from "./lib/prefs";
import { StoryViewer } from "./story/StoryViewer";
import { HomePreview } from "./home/HomePreview";
import { ShareSheet } from "./share/ShareSheet";
import type { ExportCardProps } from "./share/ExportCard";
import type { ShareKind } from "./screens/types";
import { DEVICES, DevPanel, type DevSettings } from "./dev/DevPanel";
import { DirectionBoard } from "./dev/DirectionBoard";
import { CoverExplore } from "./explore/CoverExplore";
import { CoverVariantCtx, type CoverVariant } from "./explore/variant";
import { inspectorFrameParams } from "./inspector/frameParams";
import { FacetProvider, resolveFacets } from "./variants/facets";
import { MotionProfileProvider, resolveMotionProfile } from "./motion/profile";

// Development only: the Motion Inspector workspace (?view=motion) and its preview frame (?motionFrame).
const MotionInspector = import.meta.env.DEV ? lazy(() => import("./inspector/MotionInspector")) : null;
const FRAME = inspectorFrameParams();

const STORE_KEY = "wrap26.dev";
const DEFAULTS: DevSettings = {
  motion: "system",
  repeatView: false,
  teacherEnabled: TEACHER_SLIDE_ENABLED_DEFAULT,
  autoAdvance: false,
  device: "390x844",
  cover: "current",
  journey: "current",
  facets: {},
  motionProfile: "original",
  motionSparks: false,
  marksheet: "current",
};

function loadSettings(): DevSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

function useNarrow() {
  const q = "(max-width: 720px)";
  const [n, setN] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setN(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return n;
}

export default function App() {
  const view = new URLSearchParams(location.search).get("view");
  if (view === "direction") return <DirectionBoard />;
  if (view === "covers") return <CoverExplore />;
  if (view === "bento") return <BentoLab />;
  if (view === "marksheet") return <MarksheetLab />;
  if (view === "bird") return <JourneyLab />;
  if (view === "motion" && MotionInspector)
    return (
      <Suspense fallback={null}>
        <MotionInspector />
      </Suspense>
    );
  return <Prototype />;
}

function Prototype() {
  const [profileId, setProfileId] = useState(() => new URLSearchParams(location.search).get("p") ?? "high");
  const [settings, setSettings] = useState(() => {
    // the marksheet design has no panel switch any more: always the shipped card (V2 only via ?marksheet=)
    // (the inspector's frame never reads the developer's saved settings)
    const s: DevSettings = FRAME ? { ...DEFAULTS, motion: FRAME.reduced ? "reduce" : "full" } : { ...loadSettings(), marksheet: "current" };
    const c = new URLSearchParams(location.search).get("cover") as CoverVariant | null;
    const j = journeyFromUrl();
    const m = marksheetDesignFromUrl();
    const s1 = m ? { ...s, marksheet: m } : s;
    const s2 = j ? { ...s1, journey: j } : s1;
    return c && ["current", "m3", "m2", "u", "a", "b", "c"].includes(c) ? { ...s2, cover: c } : s2;
  });
  const [route, setRoute] = useState<"home" | "story">(() => (FRAME?.start ? "story" : "home"));
  const [index, setIndex] = useState(() => {
    if (!FRAME?.start) return 0;
    const p = getProfile(profileId);
    const first = composeStory(p.record, { teacherSlideEnabled: settings.teacherEnabled });
    return Math.max(0, first.slides.findIndex((x) => x.id === FRAME.start));
  });
  const [sheet, setSheet] = useState<"comingSoon" | ShareKind | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const narrow = useNarrow();

  useEffect(() => {
    if (FRAME) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — settings just won't persist */
    }
  }, [settings]);

  const profile = getProfile(profileId);
  const plan = useMemo(
    () =>
      composeStory(FRAME?.noProgram ? { ...profile.record, nextProgram: undefined } : profile.record, {
        teacherSlideEnabled: settings.teacherEnabled,
      }),
    [profile, settings.teacherEnabled],
  );

  // Keep index valid when the deck changes under us.
  useEffect(() => setIndex((i) => Math.min(i, plan.slides.length - 1)), [plan]);

  const pickProfile = (id: string) => {
    setProfileId(id);
    setIndex(0);
    setSheet(null);
    try {
      history.replaceState(null, "", `?p=${id}`);
    } catch {
      /* ignore */
    }
  };

  const openStory = () => {
    if (profile.record.status !== "ready") return setSheet("comingSoon");
    setIndex(0);
    setRoute("story");
  };

  // screen-level effect variations: URL, then dev overrides, then the journey's preset, then the default
  // screen-level choices are final (variants/facets.tsx defaults); stored overrides from the former panel switches are ignored
  const facets = useMemo(() => resolveFacets(settings.journey, {}), [settings.journey]);
  // global motion profile (dev only): URL, then the dev panel, then "original"
  const motionProfile = useMemo(
    () => resolveMotionProfile({ profile: settings.motionProfile, sparks: settings.motionSparks }),
    [settings.motionProfile, settings.motionSparks],
  );

  const shareCard: ExportCardProps | null = useMemo(() => {
    if (sheet !== "type" && sheet !== "marksheet") return null;
    const ms = plan.slides.find((s) => s.id === "marksheet");
    const lt = plan.slides.find((s) => s.id === "learnerType");
    if (sheet === "type" && lt?.id === "learnerType") return { kind: "type", type: lt.type, reason: lt.reason };
    if (ms?.id === "marksheet")
      return { kind: "marksheet", facts: ms.facts, design: settings.marksheet };
    return null;
  }, [sheet, plan, settings.marksheet]);

  const device = DEVICES[settings.device];

  const phone = (
    <div
      className={`device ${narrow || FRAME ? "device-full" : ""}`}
      style={narrow || FRAME ? undefined : { width: device.w, height: device.h }}
    >
      <HomePreview
        name={profile.record.student.name?.trim() || null}
        seen={settings.repeatView}
        comingSoonOpen={sheet === "comingSoon"}
        onOpen={openStory}
        onDismissSheet={() => setSheet(null)}
      />
      <AnimatePresence>
        {route === "story" && (
          <motion.div
            className="story-layer"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <StoryViewer
              plan={plan}
              index={index}
              onIndex={setIndex}
              onClose={() => setRoute("home")}
              autoAdvance={settings.autoAdvance ? 6 : null}
              paused={sheet !== null}
              actions={{
                exitToHome: () => setRoute("home"),
                // PROTO: the program's enrolment page lives in the app; here we just leave the story
                openProgram: (url) => {
                  console.info("[wrap] open program", url);
                  setRoute("home");
                },
                share: (k) => setSheet(k),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{shareCard && <ShareSheet card={shareCard} onClose={() => setSheet(null)} />}</AnimatePresence>
    </div>
  );

  // The inspector's preview frame: the phone only, full-bleed, no dev controls.
  if (FRAME)
    return (
      <MarksheetDesignCtx.Provider value={settings.marksheet}>
        <JourneyCtx.Provider value={settings.journey}>
    <FacetProvider value={facets}>
    <MotionProfileProvider value={motionProfile}>
          <CoverVariantCtx.Provider value={settings.cover}>
            <PrefsProvider motion={settings.motion} repeatView={false}>
              <div className="shell shell-narrow motion-frame-shell">
                <main className="stage-col">{phone}</main>
              </div>
            </PrefsProvider>
          </CoverVariantCtx.Provider>
            </MotionProfileProvider>
    </FacetProvider>
    </JourneyCtx.Provider>
      </MarksheetDesignCtx.Provider>
    );

  return (
    <MarksheetDesignCtx.Provider value={settings.marksheet}>
    <JourneyCtx.Provider value={settings.journey}>
    <FacetProvider value={facets}>
    <MotionProfileProvider value={motionProfile}>
    <CoverVariantCtx.Provider value={settings.cover}>
    <PrefsProvider motion={settings.motion} repeatView={settings.repeatView}>
      <div className={`shell ${narrow ? "shell-narrow" : ""}`}>
        {(!narrow || devOpen) && (
          <div className={narrow ? "dev-drawer" : "dev-col"}>
            <DevPanel
              profileId={profileId}
              onProfile={pickProfile}
              settings={settings}
              onSettings={setSettings}
              plan={plan}
              route={route}
              index={index}
              onJump={(i) => {
                setIndex(i);
                setRoute("story");
                setSheet(null);
                setDevOpen(false);
              }}
              onHome={() => {
                setRoute("home");
                setDevOpen(false);
              }}
            />
          </div>
        )}
        <main className="stage-col">{phone}</main>
        {narrow && (
          <button type="button" className="dev-fab" onClick={() => setDevOpen((o) => !o)}>
            {devOpen ? "×" : "DEV"}
          </button>
        )}
      </div>
    </PrefsProvider>
    </CoverVariantCtx.Provider>
        </MotionProfileProvider>
    </FacetProvider>
    </JourneyCtx.Provider>
    </MarksheetDesignCtx.Provider>
  );
}
