/**
 * ?view=direction — Milestone 2 visual-direction board.
 * Everything on it is rendered from the real tokens and components, so the
 * board can't drift from the prototype. Not part of the product.
 */
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { composeStory } from "../data/compose";
import { getProfile } from "../data/profiles";
import { BADGES, COPY, LEARNER_TYPES } from "../data/copy";
import type { LearnerTypeId } from "../data/types";
import { PrefsProvider } from "../lib/prefs";
import { MOTION } from "../lib/motion";
import { renderSlide, SLIDE_LABEL, SURFACE, type Surface } from "../screens/registry";
import { AssetPlaceholder, BadgePill, CapstonePill, Stamp } from "../components/primitives";
import type { BadgeId } from "../data/compose";

type Status = "Approved" | "Proposed" | "Experimental" | "Needs clarification";
const Tag = ({ s }: { s: Status }) => <span className={`dir-tag dir-tag-${s.split(" ")[0].toLowerCase()}`}>{s}</span>;

function Section({ n, title, status, children, lede }: { n: string; title: string; status: Status; lede?: string; children: ReactNode }) {
  return (
    <section className="dir-sec">
      <header className="dir-sec-head">
        <span className="dir-n">{n}</span>
        <h2>{title}</h2>
        <Tag s={status} />
      </header>
      {lede && <p className="dir-lede">{lede}</p>}
      {children}
    </section>
  );
}

// ── contrast (WCAG 2.x) ────────────────────────────────────────────
type RGBA = [number, number, number, number];
const parse = (c: string): RGBA => {
  if (c.startsWith("#")) {
    const h = c.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) as RGBA;
  }
  const m = c.match(/[\d.]+/g)!.map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
};
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) =>
  [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
export function contrast(fg: string, bg: string) {
  const b = parse(bg);
  const [l1, l2] = [lum(over(parse(fg), b)), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const SURFACES: { id: Surface; name: string; used: string; bg: string; roles: [string, string, string][] }[] = [
  {
    id: "cover",
    name: "Cover board",
    used: "01 · 11 · Fresh Start",
    bg: "#1b2656",
    roles: [
      ["on", "#ffffff", "hero, names"],
      ["on-2", "rgba(255,255,255,0.76)", "framing lines"],
      ["on-3", "rgba(255,255,255,0.56)", "notes (≥14px)"],
      ["accent", "#ffc93c", "one highlight"],
    ],
  },
  {
    id: "page",
    name: "Notebook page",
    used: "02 – 09",
    bg: "#fbfaf6",
    roles: [
      ["on", "#1f2b5c", "hero numbers"],
      ["on-2", "#4a5478", "framing lines"],
      ["on-3", "#5f6789", "notes"],
      ["accent", "#c4007a", "stamp ink"],
    ],
  },
  {
    id: "certificate",
    name: "Certificate",
    used: "10 (stage + one paper sheet)",
    bg: "#24336e",
    roles: [
      ["on", "#ffffff", "stage text"],
      ["on-3", "rgba(255,255,255,0.56)", "privacy note"],
      ["sheet ink", "#1f2b5c", "on the paper sheet"],
    ],
  },
];

const TYPE_SCALE: { tok: string; spec: string; cls: string; sample: string }[] = [
  { tok: "--t-hero", spec: "80–120 · 800 · lh 1.0", cls: "hero", sample: "২১০" },
  { tok: "--t-display", spec: "32–42 · 700 · lh 1.25", cls: "display", sample: "পদার্থবিজ্ঞান" },
  { tok: "--t-title", spec: "24 · 700 · lh 1.35", cls: "dir-t-title", sample: COPY.marksheet.headline },
  { tok: "--t-lead", spec: "19 · 500 · lh 1.45", cls: "eyebrow", sample: COPY.study.lead },
  { tok: "--t-body", spec: "17 · 400 · lh 1.55", cls: "support", sample: COPY.study.comparison(35) },
  { tok: "--t-small", spec: "14 · 500 · lh 1.5", cls: "note", sample: "শুক্রবার" },
];

function MiniSlide({ children, surface, label }: { children: ReactNode; surface: Surface; label: string }) {
  return (
    <figure className="dir-mini">
      <div className="dir-mini-frame">
        <div className="story dir-mini-story" data-surface={surface}>
          <div className="story-slide" data-surface={surface}>
            {children}
          </div>
        </div>
      </div>
      <figcaption>
        {label}
        <span>{surface}</span>
      </figcaption>
    </figure>
  );
}

function StampDemo() {
  const [k, setK] = useState(0);
  return (
    <div className="dir-stampdemo" data-surface="page">
      <motion.div key={k} initial={k ? MOTION.hero.from : false} animate={MOTION.hero.to} transition={MOTION.hero.spring}>
        <Stamp name={LEARNER_TYPES.rhythm.name} />
      </motion.div>
      <button type="button" className="dir-btn" onClick={() => setK((x) => x + 1)}>
        ▶ Play T3 stamp
      </button>
    </div>
  );
}

export function DirectionBoard() {
  const plan = composeStory(getProfile("high").record, { teacherSlideEnabled: true });
  const fresh = composeStory(getProfile("fresh").record, { teacherSlideEnabled: true });
  const noop = { next() {}, exitToHome() {}, share() {} };
  const deck = [...plan.slides, ...fresh.slides];

  return (
    <PrefsProvider motion="reduce" repeatView>
      <div className="dir">
        <header className="dir-top">
          <p className="dir-kicker">Shikho Wrap 2026 · Milestone 2</p>
          <h1>Visual direction — “তোমার খাতা”</h1>
          <p className="dir-lede">
            The deck is one notebook the student flips through: the <b>cover board</b> with their name, <b>written pages</b> for each number, a{" "}
            <b>stamp</b> for who they were, a <b>certificate</b> to keep, and the <b>back board</b> to close. Identity comes from paper, ink, one stamp
            and stickers. No gradient washes, no idle animation, no drawn mascots.
          </p>
          <p className="dir-legend">
            <Tag s="Approved" /> from PRD §G / V2 &nbsp; <Tag s="Proposed" /> design decision for sign-off &nbsp; <Tag s="Needs clarification" /> blocked
            on product/assets
          </p>
          <p className="dir-nav">
            <a href="?p=high">← back to prototype</a>
          </p>
        </header>

        <Section
          n="1"
          title="Surface system — the deck as one notebook"
          status="Proposed"
          lede="Every slide declares one of three surfaces (screens/registry.tsx → SURFACE). Surfaces only set colour roles; each screen keeps its own composition, so 02 and 05 can look different while reading as the same notebook. Shown: the High profile deck + Fresh Start, in their final (reduced-motion) state, with M1 layouts."
        >
          <div className="dir-strip">
            {deck.map((s, i) => (
              <MiniSlide key={i} surface={SURFACE[s.id]} label={SLIDE_LABEL[s.id]}>
                {renderSlide(s, noop, true)}
              </MiniSlide>
            ))}
          </div>
        </Section>

        <Section n="2" title="Colour roles & contrast" status="Proposed" lede="Brand hues are approved (navy, blue, magenta, gold, ground). Proposed: navy-900 for the board, a warm-white paper, a ‘ballpoint’ navy ink, and magenta darkened to #C4007A for stamp ink on paper (raw #E2008D is 4.3:1 there).">
          <div className="dir-surfaces">
            {SURFACES.map((s) => (
              <div key={s.id} className="dir-surface">
                <div className="dir-surface-swatch" style={{ background: s.bg }}>
                  <b style={{ color: s.roles[0][1] }}>{s.name}</b>
                  <span style={{ color: s.roles[1][1] }}>{s.used}</span>
                </div>
                <table>
                  <tbody>
                    {s.roles.map(([role, c, use]) => {
                      const bg = role === "sheet ink" ? "#fbfaf6" : s.bg;
                      const r = contrast(c, bg);
                      return (
                        <tr key={role}>
                          <td>
                            <i style={{ background: c, outlineColor: bg }} />
                            {role}
                          </td>
                          <td>{use}</td>
                          <td className={r >= 4.5 ? "ok" : r >= 3 ? "lg" : "bad"}>
                            {r.toFixed(1)}:1 {r >= 4.5 ? "AA" : r >= 3 ? "AA large" : "fail"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <p className="dir-note">
            Actions stay Shikho blue #5468FF on every surface (approved action colour). Gold is reserved for stickers and the single highlight on dark
            surfaces — never body text on paper.
          </p>
        </Section>

        <Section n="3" title="Type hierarchy — Baloo Da 2, Bengali numerals" status="Proposed" lede="Font approved (PRD §G); scale proposed. Bangla gets taller line boxes than Latin so matras and vowel signs never clip. One hero element per slide: either a hero number or a display name, never both.">
          <div className="story dir-type" data-surface="page">
            <div className="story-slide" data-surface="page" style={{ position: "relative", padding: "24px 28px" }}>
              {TYPE_SCALE.map((t) => (
                <div key={t.tok} className="dir-type-row">
                  <code>
                    {t.tok}
                    <small>{t.spec}</small>
                  </code>
                  <p className={t.cls} style={{ margin: 0 }}>
                    {t.sample}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section n="4" title="Signature element — the learner-type stamp" status="Proposed" lede="The one mark that makes the Wrap recognisable. A typographic rubber stamp in magenta ink with a ২০২৬ dateline; reused unchanged on 09, the marksheet and the share card. All seven types share the identical treatment, so none looks ‘better’ (V2).">
          <div className="dir-row">
            <StampDemo />
            <div className="dir-stamps" data-surface="page">
              {(Object.keys(LEARNER_TYPES) as LearnerTypeId[]).map((id) => (
                <Stamp key={id} name={LEARNER_TYPES[id].name} size="sm" />
              ))}
            </div>
          </div>
          <p className="dir-note">Motion T3: drops from 1.35×, settles with one small overshoot at its −4° rest. Reduced motion / repeat view: already stamped.</p>
        </Section>

        <Section n="5" title="Badge system — stickers" status="Needs clarification" lede="Treatment proposed: a die-cut gold sticker, ‘stuck’ onto the page; the capstone inverts to navy + gold so it reads as rarer, not just one more. Badge artwork is a missing asset — the art slot is shown, not drawn.">
          <div className="dir-stickers" data-surface="page">
            {(Object.keys(BADGES) as BadgeId[]).map((b) => (
              <BadgePill key={b} id={b} />
            ))}
            <CapstonePill />
          </div>
          <div className="dir-stickers" data-surface="page">
            <BadgePill id="quizWarrior" art />
            <span className="dir-note" style={{ margin: 0 }}>
              ← with artwork slot (when the 4 badge + capstone files arrive)
            </span>
          </div>
        </Section>

        <Section n="6" title="Illustration conventions" status="Needs clarification" lede="Only approved Shikho assets (3D mascot library, teacher avatars, badge art). None are in the repo yet, so every slot below is a labelled placeholder. Rules proposed:">
          <div className="dir-row">
            <ul className="dir-rules">
              <li>At most one illustration per slide, and only where it carries the moment (01 cover, 09 reveal, Fresh Start). 02–08 are carried by the number.</li>
              <li>Illustration never sits behind text and never shrinks the hero number.</li>
              <li>Mascot stays the same character across the deck; pose changes, style doesn’t.</li>
              <li>Teacher: approved photo → generic male/female avatar → name only. Never a guessed face.</li>
              <li>No CSS/emoji/SVG stand-ins for mascots, ever.</li>
            </ul>
            <div className="dir-slots">
              <figure>
                <AssetPlaceholder label="mascot · cover" w={120} h={120} />
                <figcaption>01 · ≤ 35% height</figcaption>
              </figure>
              <figure>
                <AssetPlaceholder label="mascot · reveal" w={96} h={96} />
                <figcaption>09 · beside stamp</figcaption>
              </figure>
              <figure>
                <AssetPlaceholder label="generic avatar" w={96} h={96} round />
                <figcaption>04 · 128 px circle</figcaption>
              </figure>
            </div>
          </div>
        </Section>

        <Section n="7" title="Motion hierarchy" status="Proposed" lede="Purposeful, never decorative (PRD §G). Every animation belongs to one tier; each tier ships with its reduced-motion equivalent (src/lib/motion.ts).">
          <table className="dir-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Used for</th>
                <th>Timing</th>
                <th>Reduced motion</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>T0 feedback</td>
                <td>Button press</td>
                <td>{MOTION.feedback.duration * 1000} ms</td>
                <td>none</td>
              </tr>
              <tr>
                <td>T1 nav</td>
                <td>Slide → slide</td>
                <td>
                  {MOTION.nav.duration * 1000} ms, {MOTION.nav.distance}px travel
                </td>
                <td>{MOTION.navReduced.duration * 1000} ms cross-fade</td>
              </tr>
              <tr>
                <td>T2 content</td>
                <td>The slide’s one data beat: number counting (02), register marks (03), quiz data drawing in (05), rows assembling (10)</td>
                <td>
                  {MOTION.content.duration * 1000} ms, {MOTION.content.stagger * 1000} ms stagger; count {MOTION.content.countUp}s
                </td>
                <td>final state</td>
              </tr>
              <tr>
                <td>T3 hero</td>
                <td>Stamp landing on 09 — once per deck</td>
                <td>
                  {MOTION.hero.holdMs} ms hold → spring {MOTION.hero.spring.stiffness}/{MOTION.hero.spring.damping}
                </td>
                <td>already stamped</td>
              </tr>
            </tbody>
          </table>
          <p className="dir-note">Never: looping/idle motion, particles, confetti, parallax, gradient shifts, shimmer on repeat view.</p>
        </Section>
      </div>
    </PrefsProvider>
  );
}
