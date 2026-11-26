# Wrap Reference Inventory

An inventory of the external reference prototype, to pick individual elements from it for our Wrap. Our project stays the foundation. Nothing here has been integrated; this is analysis only (26 Nov 2026).

| | |
|---|---|
| Reference repository | https://github.com/tasmeetiqbal-tech/shikho-year-end-wrap-prototype |
| Local copy (read-only) | a separate clone beside this project: `../wrap-reference` |
| Commit analysed | `d6b2e9d95c8c42ee345009e14eafeb4a4f9d2c00` (branch `main`, one commit: "Year End Wrap 2026 prototype: picker plus directions A3, B3, C3") |
| Live link (per its README) | https://shikho-year-end-wrap.vercel.app |
| Licence | **No licence file.** Reuse needs the owner's permission (see Limitations). |

Line numbers below refer to that commit.

---

## 1. What the reference is

- **Format:** a design prototype in plain HTML, CSS and JavaScript, with no build step and no framework. There's no React, GSAP or Motion; animation is hand-written.
- **Structure:** three complete design directions, each one self-contained `index.html` of about 2,000–2,300 lines, with a `DIRECTION.md` design note.
- **Picker:** a root `index.html` loads a direction in a phone frame (`?v=a|b|c`).
- **Data:** sample data for one student, নিশাত (Nishat), all made up. Examples: 142 hours, 187 study days, a 23-day run, 63 of 72 live classes, 148 quizzes, 2,860 video minutes.

```
README.md                               how to open; ?v= and ?s= deep links
index.html                              direction picker (144 lines)
flows/year-end-wrap/directions/
  A3-poster/     index.html (2,274 lines) · DIRECTION.md · fonts/hind-siliguri-700-bengali.woff2 · mascot/*.png (3)
  B3-marksheet/  index.html (2,125 lines) · DIRECTION.md
  C3-journey/    index.html (2,053 lines) · DIRECTION.md · fonts/*-digits.woff2 (2) · mascot/*.png (3)
  _mascot/       README.md · x3/*.png (20 bird poses, placeholder crops)
shared/          tokens.css (172) · base.css (255) · components.js (531) · fonts/ (Baloo Da 2 ×4, HK Grotesk ×5)
```

**Referenced in the notes but not in the repository:**
- `shots/`, `motion.webm`;
- the earlier versions A2, B2 and C2;
- the motion kit (`tools/opus-5-5-motion-graphics/`) that the effects are based on;
- `02 Story.md`.

**Who uses `shared/`:** only C3 links `shared/tokens.css`, `base.css` and `components.js`. A3 and B3 are fully self-contained. The `UI.Mascot` (an orange book) in `components.js` is explicitly *not* Shikho's mascot (see `_mascot/README.md`).

### Shared look (all three directions)

| Token | Value |
|---|---|
| Stage gradient `--hdrbg` | A soft cyan glow at the top right and a soft magenta glow at the bottom left, over a diagonal purple → indigo → navy base (#3A1C9C, #1E2B99, #0F1F59) |
| Palette | navy #0F1F59, indigo #1E2B99, purple #3A1C9C, blue #2D47D6, magenta #E2008D / #A8006A, gold #FFC93C / #C98F00, cyan #00C8FF |
| Light washes | `--wash` 135° #EEE8FF → #FBE4F3 → #E0F1FF; `--deep` 165° #3A1C9C → #1E2B99 → #0F1F59 |
| Type | Hind Siliguri (Google Fonts) 400–700. Bangla digits are forced to a 700-weight subset because Hind Siliguri draws "১" as a hook at 400–600. |
| Motion maths | `eio` (cubic in-out), `eo` (cubic out), `spr(t, ζ, ωn)` (closed-form damped spring), `rng(seed)` (mulberry32), Catmull-Rom `smoothPath` |
| Clock | Every slide is a seekable timeline: `?s=<state>&t=<seconds>` freezes any moment. Reduced motion (`&motion=reduce` or the OS setting) jumps to the end state. |
| Controls | Tap right 70 % for next and left 30 % for back; hold to pause; 6 s auto-advance after each entry |
| Earned titles | Live: ফার্স্ট বেঞ্চার / লাইভ ক্লাসের নিয়মিত / লাইভ ক্লাসে হাজির. Quiz: কুইজ চ্যাম্পিয়ন / যোদ্ধা / খেলোয়াড়. Video: ভিডিও ম্যারাথনার / মনোযোগী দর্শক / ভিডিও দেখা শুরু. **Not PRD copy.** |

---

## 2. Direction A3 — Poster in motion

`flows/year-end-wrap/directions/A3-poster/index.html`

- **Look:** bold poster style. Each slide has its own layered gradient (listed per screen), with gold numbers, magenta and purple stages, a scratch card and confetti.
- **Animation:** pure functions of time sampled into **Web Animations keyframes** (`kfs()`, `anim()` → `element.animate`), so the browser's compositor plays them. Cues fire from a slide clock (`at()`, `fireDue()`); `seekTo(T)` pauses every animation at its local time.
- **Canvas:** used for confetti and the end-screen dots.

| Screen (`?s=`) | Background | Main infographic | Choreography | Notable effects | Code | Extractable |
|---|---|---|---|---|---|---|
| **home**, **home-open** | Home: light `--bg` #F6F7FB with a purple header. Cover: `--hdrbg` | "তোমার ২০২৬ তৈরি" banner on a mock Shikho home | The banner grows into the full cover in 0.95 s with no cut: shape lerp of the card, page behind dims, bird flies an arc, the title travels into the cover | Banner→cover morph (kit "Button to player / Card to workspace") | `layoutHome`, `showHome`, `openStory`, `morphFromBanner` (≈1524–1640) | Medium: tied to its DOM and to the home mock |
| **cover** | `--hdrbg` | Gold ২০২৬ row | Gold row starts as an outline; the fill rises through it from 0.6 to 2.0 s with a light edge line (masked type, transforms only) | Masked outline-to-fill type | slide markup + cover cues | High: a self-contained CSS/JS effect |
| **hours** | `--st-hours`: gold glow top-left, cyan bottom-right, over blue #2D47D6 → #1E2B99 → #0F1F59 (172°) | 24 school-day tiles + count to ১৪২ | Tiles spring in staggered (rotated, dropped, overshoot) and fill gold as the count passes each 6 h; count lands at 2.25 s with a gold flash | Spring stack, flash | `HR`, `counter`, `land`, `flash` (≈1403–1430, 1642) | High |
| **live** | `--st-live`: gold centre glow, magenta top-right, purple → navy | Ring of 72 seats | A pulse travels round the ring once; each attended seat lights gold with a small ring; 9 missed stay empty; centre counts to ৬৩. Badge ফার্স্ট বেঞ্চার, bird clapping | Flowing-path pulse; badge stamp | `layoutRing`, `MISSED` (≈1334–1353), `stampBadge` (1430) | High (ring), Medium (badge) |
| **quiz** | `--st-quiz`: cyan top-right, magenta bottom-left, indigo → purple → navy | Pile of 7 quiz cards | Cards fly in one by one and spring onto a pile (position and angle springs) while the count runs to ১৪৮; a 148 of 150 bar | Spring stack with angle overshoot | `QC_ROT`, `QC_OK` (1354) | High |
| **video** | `--st-video`: cyan top ellipse, magenta bottom-right, navy → indigo → purple | Player + film strip of 24 frames | "ভিডিও দেখো" pill grows into a player; the play icon travels to the controls, gains a disc and morphs to pause (`PLAY`/`PAUSE` path morph); minutes count to ২,৮৬০ | Pill→player morph; play→pause shape morph | `PLAY`, `PAUSE` (1702) | High |
| **type**, **type-revealed** | `--st-night` (purple ellipse glow, magenta corner, navy); reveal: `--st-reveal` magenta → purple | Scratch card, then the type name, then a month chart | Scratch the foil (canvas); the name lands one **grapheme** at a time (elastic: grows from baseline, overshoots, squashes, neighbours make room); 10 month bars thin into stems and a gold Catmull-Rom line draws through them | **Elastic Bangla type** with grapheme-safe splitting (`Intl.Segmenter` + hasanta/vowel-sign joining); **bars→line chart morph**; scratch card; rays | `splitGraphemes`, `elasticFrames`, `elasticName` (1795–1844); `buildChart`, `barsMorph` (1845–1874); `paintFoil`, `scratchLine` (1734–1787) | **High**: elastic type and chart morph are self-contained |
| **share**, **share-sheet** | `--hdrbg` | 3 share cards | Cards start as a tilted stack and spring apart; swiping runs on spring physics (stiffness 240, damping 17), release speed carries into the spring, up to 11° 3D lean | **Spring carousel with velocity hand-off** | `SH`, `pose`, `entryPose`, `sharePaint`, `carUp` (1913–2009) | High |
| **end** | `--st-end`: gold, cyan and magenta glows over purple → navy | ২০২৭ drawn by 187 dots | 187 dots (one per study day) fly from a seeded scatter and gather into ২০২৭ left to right (targets by farthest-point sampling inside the rendered glyphs); 23 magenta = the run; shimmer; confetti at 2.35 s | **Particle logo on canvas** | `buildDots`, `paintDots`, `ramp` (2010–2105) | **High**: one canvas, data-driven |
| closed | Home again | — | The banner offers to resume | — | `showHome('closed')` | — |

**Shared within A3:**
- **Confetti:** seeded, and halved on low-memory phones (`burst`, 1366).
- **Spring and easing helpers:** `spr`, `eio`, `eo`, `rng`.
- **Bird images:** a `MASCOT` map of PNG poses (1114).
- **Earned-title rules:** `liveTitle`, `QUIZ_TIERS`, `VIDEO_TIERS` (1288–1293).

---

## 3. Direction B3 — Marksheet, motion pass

`flows/year-end-wrap/directions/B3-marksheet/index.html`

- **Look:** a white khata (exercise book) on a purple stage, with magenta stamp and ink, a gold seal and sticker, and a bird with a job on every slide.
- **Stage background** (`.stagebg`): `--hdrbg`, plus a soft violet radial glow and faint 118° diagonal stripes.
- **Inside pages:** a "paper" theme.
- **Clock:** its own (`CLK`, `later()`, `track()`, `runTrans()`). Existing CSS keyframes are paused at their local time through the Web Animations API.
- **Page changes:** khata pages turn in 3D.

| Screen (`?s=`) | Background | Main infographic | Choreography | Notable effects | Code | Extractable |
|---|---|---|---|---|---|---|
| **home**, **home-open** | Light home; stage | "তোমার ২০২৬ খাতা" card with a small khata | The card shell grows to full screen; its white fades into the stage; the small khata flies to the cover khata's place; the bird then writes the name | Card→workspace | `homeGeo`, `homePose`, `openHome` (1831–1867) | Medium |
| **cover**, **book-open** | Stage | Khata (`.nbk`): blue cover, magenta spine, gloss | Bird writes the name on the label. To hours: the khata lifts, straightens and **swings open on its spine in 3D**; three pages fan apart in depth to a vanishing point and settle | **3D book opening with page fan** | `bookOpen` (1954–1984) | Medium: needs its markup and perspective setup |
| **hours** | Paper page | ১৪২ in "ink" | ১৪২ starts as an outline; ink rises through it with a dashed magenta level line and a counting pill; pop, sparks, gold highlighter sweep, pencil circle | **Ink-fill masked number with level line**; highlighter sweep | `hoursFx` (1591) | High |
| **live** | Paper | Hajira register, 72 boxes (6×12) | Ticks pop in; the register dims; magenta corner marks lock on the total cell, which **zooms out into a panel** (৬৩/৭২, a bar, হাজিরা ৮৮%) with dashed guides | Cell-to-panel zoom with guides; gold rosette seal | `liveFx` (1629), `seal` (1282) | High |
| **quiz** | Paper | Month-end running total (10 bars), 150 line | Bars rise, thin into stems, a line draws through the tops, the area fills, dots pop; the last dot gets a ১৪৮ label under the dashed 150 line | Bars→line chart morph with area | `quizFx`, `QZ_SERIES`, `smooth` (1648–1687) | High |
| **video** | Paper | Button→player, two film strips | A magenta button grows into a player; the play icon travels, gains a disc, morphs to pause while minutes count and the bar fills, then back to play; film frames light gold | Pill→player; point-list shape morph (`quad`) | `videoFx` (1689) | High |
| **type**, **type-revealed** | Paper | Stamp + attendance grid | Stamp slam; indigo slats cover the grid and pull back; a **glass lens** (1.3× magnifier with cyan/magenta fringes) reads down the month rows, settles on August; the 23-day run turns gold; pencil circle | **Slat reveal**; **glass lens** | `gridFx` (1715), `stamp` (1176), `attGrid` (1249), `reveal` (2015) | Medium (the lens needs a blurred copy of the content) |
| **share** | Stage | 3 cards incl. a marksheet card | The stack springs apart (damping per card); a glass lens reads the marksheet rows top to bottom; stamp; seal spins in. Swipe uses a closed-form spring | Spring carousel; lens over the marksheet | `springAt`, `carState`, `renderCarousel` (1401–1484), `msLens` (1734) | High (carousel) |
| **end** | Stage | 2026 khata → 2027 khata | 187 ink dots rise off the 2026 khata and arc to write ২০২৭ on the new khata; faint guide fill; gold stars | Particle logo with arc paths | `glyphPoints`, `yearDotsFx` (1757–1830) | High |

**Shared within B3:**
- **Logo marks:** `BIRD`, `WORD`, `MARK` (1144–1152).
- **Drawn decoration:** `scallop`, `guilloche`, `awardSvg` for stickers, seals and awards (1200–1350).
- **Bird images:** a `MASCOT` map of PNG poses with `GRIP` hand offsets (1123–1140).

---

## 4. Direction C3 — Journey (motion pass)

`flows/year-end-wrap/directions/C3-journey/index.html`

- **Look:** a purple stage with the bird at 180–250 px, a 12-month day grid with the magenta August run, a school with gold windows, a gold door, and a road to a 2027 flag.
- **Slide background:** every slide is `--hdrbg`, with per-slide decoration on top: drifting glows (`glows`, a `glw` 8 s alternate animation), sparkles, three stacked twinkling star SVG layers, and canvas confetti.
- **Animation:** every moving part is a **pure function of the slide clock** (`put()` writes only on change; `kf()` keyframe interpolation), driven by requestAnimationFrame.
- **Slide change:** one smooth expo-out push.
- **Dependencies:** loads `shared/tokens.css`, `base.css` and `components.js` (icons, logo, subject glyphs).

| Screen (`?s=`) | Background | Main infographic | Choreography | Notable effects | Code | Extractable |
|---|---|---|---|---|---|---|
| **home**, **home-tap** | Light home; the banner is the cover at small size | Banner with the waving bird on the road of squares | Tap: the card frame grows while its content is counter-scaled; scene and bird travel to their cover places; the title moves into the story bar; home steps back and dims | Counter-scaled card grow | `renderHome`, `mountCover → grow` (1049–1210) | Medium |
| **cover** | `--hdrbg` + light rays (conic gradient) + glow | ২০২৬ + a road of squares to the school | ২০২৬ outline → gold fill rising with an edge line (font metrics via `measureText`); **canvas road**: squares start dim, a light travels up and each square pops as it arrives; year lands with confetti | Masked type; travelling light on a canvas road | `renderCover`, `mountCover`, `paintRoad`, `roadOf` (846–897, 1068–1210) | High |
| **days** | `--hdrbg` | 12-month calendar grid, 187 study days, magenta run | 187 squares fly from a seeded scatter into their cells in date order (canvas, trails, slight curve); each month hands over to crisp SVG; corner brackets; ১৮৭ pulls out of the grid into the headline while counting; the view zooms into August, the run flares, zooms back out | **Particle fly-in to a calendar grid**; dashboard zoom; streak flare | `YEAR` model (749–783), `monthCells`, `monthsGrid` (794–832), `renderDays`, `mountDays`, `paintFly` (1212–1313) | High (needs per-day data) |
| **hours** | `--hdrbg`; day/night bar with `--wash` / `--deep` fills | School SVG with 24 gold windows; day/night split bar | One smooth count; each window lights and pops as the count passes 6 h; the bar fills (day part, then night) with counting labels and a white marker on the edge | Count-driven reveals; chart fill | `renderHours`, `mountHours` (1319–1382) | High |
| **live** | `--hdrbg` | Classroom of 72 seats in perspective (narrowing to the board) | A **glass lens** moves from the back row to the front bench; attended seats light gold as it passes; the count runs with the lit seats. Badge ফার্স্ট বেঞ্চার | Glass focus over a perspective grid | `renderLive`, `mountLive` (1410–1475) | High |
| **quiz** | `--hdrbg` | 12 quiz cards → stack → fan | Cards fly in from both sides and spring into a stack; the count runs as they land; the top three fan out (most overshoot on top). Badge কুইজ যোদ্ধা and a 148 of 150 bar | Spring stack and fan | `renderQuiz`, `mountQuiz`, `QSUB` (1476–1526) | High |
| **video** | `--hdrbg` | Two film strips of subject videos | Strips run across; minutes count on the same easing, so number and film stop together; the frame under the gold playhead lights | Count-synced film strip | `frames`, `renderVideo`, `mountVideo` (1527–1568) | High |
| (badge rig) | — | Badge panel on live, quiz, video | Panel rises; the medal stamps in (from 1.9× with a turn, spring); a gold ring pulses; star sparks; the title rises through a mask | Stamp + ring + sparks | `badgePanel`, `badgeRig`, `medal` (932–947, 1389–1409) | High |
| **type**, **type-revealed** | `--hdrbg` | Closed door, three evidence chips, emblem | The tap pulls the chips into the door; the door swings open; light slats pull back one after another to show the emblem; নিয়মিত পড়ুয়া lands grapheme by grapheme with a damped spring on the baseline | Slat reveal; elastic grapheme type | `renderType`, `mountType` (1569–1650), `graphemes` (686) | Medium–High |
| **share**, **share-sheet** | `--hdrbg` | 3 cards (badges, calendar grid, subject) | A fanned stack springs apart; swipe with resistance at the ends; settles on an overshooting spring; tap a side card to centre it | Spring carousel | `renderShare`, `mountShare` (1683–1753) | High |
| **end** | `--hdrbg` + glows | Road to the 2027 flag | The bird climbs the road in three hops with squash on landing; light pulses travel to the flag with a gold ring on each arrival; the flag waves (6 strips); confetti | Hop with squash; path pulses; flag wave | `flag`, `renderEnd`, `mountEnd`, `climb`, `pulses` (1754–1819) | High |

**Shared within C3:**
- **Effects layer:** `FX` canvas for confetti and sparks (977–1034).
- **Helpers:** `bird()` and `birdSet()` (710–732).
- **Badge rules:** `liveBadge`, `quizBadge`, `videoBadge` (733–744).
- **Digit font:** an inlined `YJ Digits` base64 face (Noto Sans Bengali and Hind Siliguri 700 digits).

---

## 5. Reusable assets

| Asset | Where | Notes |
|---|---|---|
| Bird poses (PNG, 20) | `_mascot/x3/*.png`; cleaned copies in A3 and C3 `mascot/` | **Placeholder crops** from phone screenshots, about 100–140 px upscaled ×3 (only `waving-hello.png` is a full 604×640 export). Not the approved artwork; our approved bird SVGs stay the source. The Figma source is named in `_mascot/README.md`. |
| Fonts | `shared/fonts/` Baloo Da 2 (4 weights, TTF), HK Grotesk (5) | We already load Baloo Da 2 from Google Fonts. |
| Digit subsets | A3 and C3 `fonts/*.woff2` | Hind Siliguri workaround; we don't use Hind Siliguri. |
| Gradients | `--hdrbg`, `--st-*`, `--wash`, `--deep` (CSS) | Pure CSS; easy to lift. |
| SVG drawings | Inline in each file: medals, seals, scallops, guilloche, stars, school, door, flag, road, subject glyphs (`components.js`) | Self-contained strings. |
| Icons | `shared/components.js` `ICONS`, `SUBJECT_GLYPHS` | Plain SVG paths. |

---

## 6. Technical compatibility with our project

| Aspect | Reference | Ours | What reuse takes |
|---|---|---|---|
| Stack | Plain HTML and ES5 JS, global state, string templates, one file per direction | React 19 + Vite + TypeScript; one component per screen; registry and dev variants | Port effects into React components, not iframes. Markup → JSX; string templates → components. |
| Animation engine | Pure functions of time (`eio`, `spr`, Bézier) via: **WAAPI** keyframes (A3, B3), **rAF painters** (C3), **canvas** (particles, confetti, road) | GSAP master timelines and Motion sequences, on the central tokens and timeline adapters (`src/motion/`) | The maths ports directly. Drive each "painter(t)" from a GSAP timeline (`tl.to(proxy, { onUpdate })`), as the Timekeeper does. **Don't keep `element.animate`**: the Motion Inspector's frame removes it to drive Motion on its clock, so ported WAAPI code would break there. Canvases are fine (they run on rAF, which the inspector virtualises). |
| Seeking / review | Its own `seek(t)` and `?s=&t=` freeze per direction | Motion Inspector (`?view=motion`): virtual clock, deterministic replay, Original/Refined comparison | Ported effects get seeking for free through the inspector. Their own seek code isn't needed. |
| Background | Per-slide CSS layered gradients (radial glows over a linear base); swapped per slide with no cross-fade (A3) or one shared stage (B3, C3) | One persistent `StoryBackground` per story: 34 registered colour stops transitioning in place, plus optional per-variant decoration layers cross-faded (`decorSrc`) | Layered radial glows can't interpolate through our stop list. Add them as an **optional gradient overlay layer per variant**, cross-faded like `decorSrc`. Or add new `BgVariant`s whose base linear gradient matches, with the glows as overlays. The architecture supports both without touching existing variants. |
| Screen lifecycle | `render()` then `mount()` per slide; `go(id, dir)`; leave animations in CSS | `StoryViewer` + `AnimatePresence` + `usePresence`; hand-over table (`motion/handovers.ts`); entry kinds | A reference transition (C3's expo push, B3's page turn) becomes a new hand-over kind in `handovers.ts`. Reference screens become new components behind a variant switch. |
| Variants | `?s=` states; directions are separate files | URL params per screen (`?live=v2`…), `JourneyMode` (current / bird / birdled), `versions.ts` (Original/Refined) | Add reference-derived screens as variants (e.g. `?live=ref-ring`) or as a new journey mode. Don't overwrite the approved screens. |
| Data | Inline `DATA` objects: per-day calendar, monthly series, attendance pattern, night %, 24 school days | `WrapRecord` / `composeStory` (`src/data/`) | Several effects need data we don't model (per-day study dates, monthly quiz totals, night %); see each screen. Count-based effects (rings, piles, film strips) need only totals we have. |
| Copy | Many unreviewed lines and titles | **PRD copy only** (project rule) | Take mechanics and visuals, **not text**. Earned titles and helper lines are not PRD. |
| Typography | Hind Siliguri, plus digit hacks | Baloo Da 2, Noto Sans Bengali | Keep our fonts. The grapheme splitter (`Intl.Segmenter` + hasanta join) is font-agnostic and reusable. |
| Mascot | PNG placeholder crops | Approved bird SVGs (`src/journey/timekeeper/`, the Bird Journey rig) | Never import the PNG birds. Re-stage any bird moment with our SVG poses. |
| Performance | Tuned: transforms and opacity, canvases capped at 1.5×, `put()` writes only on change, low-memory budget | Same principles; audit and probe tooling | Keep their budgets (particle counts, canvas DPR caps) when porting. |

### Easiest to lift
- **Maths and helpers:** `spr`, `eio`/`eo`, `rng` (mulberry32), Catmull-Rom `smoothPath`, the grapheme splitter. These are pure functions.
- **Self-contained effects:**
  - the particle year (A3 / B3 end);
  - the bars→line chart morph (A3 type, B3 quiz);
  - the seat ring (A3 live);
  - the spring carousel (A3 / B3 / C3 share);
  - the masked outline-to-fill number (A3 cover, B3 hours, C3 cover);
  - the pill→player morph (A3 / B3 video);
  - the badge stamp rig (C3).
- **Backgrounds:** pure CSS gradient values.

### Harder to lift
- **Home→cover morphs:** they depend on a mock home screen we don't have in the story. Ours has its own home banner.
- **B3's 3D khata opening:** a whole page system.
- **Glass lenses:** they need a blurred duplicate of the content.
- **C3's days fly-in:** needs per-day study data and the calendar model.

---

## 7. Mapping to our screens

| Our screen | Closest reference | Candidate elements (taste and data permitting) |
|---|---|---|
| 01 Cover | A3, B3 and C3 covers | Masked outline→gold-fill year; C3's canvas road with a travelling light; light-ray conic background |
| 02 Study time | A3 hours (tiles), B3 hours (ink fill), C3 hours (school windows, day/night bar) | Spring-in tiles filling with the count; ink-fill number with a level line; day/night split bar (needs night % data) |
| 03 Live classes | A3 ring, B3 register zoom, C3 classroom lens | 72-seat ring with a travelling pulse (totals only); register→panel zoom |
| 04 Teacher | — | (none) |
| 05 Quiz | A3 pile, B3 chart, C3 stack and fan | Spring card stack / fan (totals only); bars→line (needs a monthly series) |
| 06 Video | A3 / B3 player, C3 film strips | Pill→player with play→pause morph; count-synced film strip |
| 07 Subject | — | (none; C3 share card 3 has a subject layout) |
| 08 Most active day | C3 days | Calendar fly-in, zoom into a month, run flare (needs per-day data) |
| 09 Learner type | A3 scratch + elastic name; B3 stamp + slats + lens; C3 door + slats | Elastic grapheme name; slat reveal; scratch card |
| 10 Marksheet | B3 marksheet card | Lens reading rows; stamp thump; seal spin |
| 11 Closing | A3 / B3 particle ২০২৭; C3 road to the flag | 187-dot particle year (needs a days count); road pulses and flag wave |
| Share | All three | Spring carousel with velocity hand-off (we have a share sheet, not a carousel) |
| Backgrounds | A3 per-slide `--st-*`; B3 / C3 `--hdrbg` + glows + stripes | Gradient overlays per variant |

---

## 8. Limitations and open questions

1. **Permission.** The repository has no licence file. Its notes credit the reference's author for the direction. Confirm with the owner that code and assets may be reused before copying anything verbatim.
2. **Placeholders.** Data, titles, helper copy and bird images are placeholders by the notes' own account. Only mechanics and visual treatments are candidates.
3. **Missing material.** `shots/`, `motion.webm`, the A2/B2/C2 versions and the motion kit aren't in the repository. The design notes describe effects that can't be compared against their recordings.
4. **WAAPI dependence.** A3 and B3 run their keyframes with `element.animate`. Port them to GSAP or Motion rather than keep WAAPI, so they work with the Motion Inspector and our token system.
5. **Data gaps.** Per-day dates, monthly series, night %, school-day counts and attendance patterns aren't in `WrapRecord`. Effects that depend on them need new fields or must be reworked to totals.
6. **Not executed.** Nothing in the reference was run or installed for this analysis; it was read as source only.

---

## 9. Refreshing this inventory

```
cd ../wrap-reference && git rev-parse HEAD   # (from this project's root) compare with the commit above
git log --oneline d6b2e9d..HEAD                                    # what changed since
```
If the reference moves on, re-read the changed directions and update the tables and the commit hash. Never commit to, push to or edit the reference.
