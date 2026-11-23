import { JourneyCtx, journeyFromUrl } from "./journey/journeyMode";
import { JourneyLab } from "./journey/JourneyLab";
import { BentoLab } from "./marksheet/BentoLab";
import { useEffect, useMemo, useState } from "react";
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

const STORE_KEY = "wrap26.dev";
const DEFAULTS: DevSettings = {
  motion: "system",
  repeatView: false,
  teacherEnabled: TEACHER_SLIDE_ENABLED_DEFAULT,
  autoAdvance: false,
  device: "390x844",
  cover: "current",
  journey: "current",
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
  if (view === "bird") return <JourneyLab />;
  return <Prototype />;
}

function Prototype() {
  const [profileId, setProfileId] = useState(() => new URLSearchParams(location.search).get("p") ?? "high");
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    const c = new URLSearchParams(location.search).get("cover") as CoverVariant | null;
    const j = journeyFromUrl();
    const s2 = j ? { ...s, journey: j } : s;
    return c && ["current", "m3", "m2", "u", "a", "b", "c"].includes(c) ? { ...s2, cover: c } : s2;
  });
  const [route, setRoute] = useState<"home" | "story">("home");
  const [index, setIndex] = useState(0);
  const [sheet, setSheet] = useState<"comingSoon" | ShareKind | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const narrow = useNarrow();

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — settings just won't persist */
    }
  }, [settings]);

  const profile = getProfile(profileId);
  const plan = useMemo(
    () => composeStory(profile.record, { teacherSlideEnabled: settings.teacherEnabled }),
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

  const shareCard: ExportCardProps | null = useMemo(() => {
    if (sheet !== "type" && sheet !== "marksheet") return null;
    const ms = plan.slides.find((s) => s.id === "marksheet");
    const lt = plan.slides.find((s) => s.id === "learnerType");
    if (sheet === "type" && lt?.id === "learnerType") return { kind: "type", type: lt.type, reason: lt.reason };
    if (ms?.id === "marksheet")
      return { kind: "marksheet", facts: ms.facts };
    return null;
  }, [sheet, plan]);

  const device = DEVICES[settings.device];

  const phone = (
    <div
      className={`device ${narrow ? "device-full" : ""}`}
      style={narrow ? undefined : { width: device.w, height: device.h }}
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
                share: (k) => setSheet(k),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{shareCard && <ShareSheet card={shareCard} onClose={() => setSheet(null)} />}</AnimatePresence>
    </div>
  );

  return (
    <JourneyCtx.Provider value={settings.journey}>
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
    </JourneyCtx.Provider>
  );
}
