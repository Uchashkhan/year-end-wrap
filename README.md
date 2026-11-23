# Shikho Wrap 2026 — interactive prototype

This is a design reference for the Android build, not production code. Native will extend `:feature:quarterreview`.

```
pnpm dev        # http://127.0.0.1:5180  (?p=high | moderate | limited | fresh | capstone | longName | noName | noLive | generating)
                # http://127.0.0.1:5180/?view=direction  ← M2 visual-direction board
pnpm typecheck
```

## Sources (priority order)
1. **Design Brief V2** (`~/Desktop/Wrap 2026 — Design Brief.pdf`, 17 Nov). Governs content, copy, rules.
2. **PRD** (`~/Desktop/Wrap 2026 — PRD.pdf`). Covers architecture and anything V2 doesn't.
3. The three directions A/B/C at shikho-year-end-wrap.vercel.app. Used as reference only.

## Structure
| Path | Role |
|---|---|
| `src/data/types.ts` | Mock `wrap_2026` record shape (the real schema is still to be built) |
| `src/data/config.ts` | Thresholds/badge bars, each tagged `V2` (binding) or `TBD` (placeholder) |
| `src/data/compose.ts` | Record → ordered slide list + omission reasons. All visibility rules live here only |
| `src/data/copy.ts` | All Bangla copy (V2, all *proposed*), learner types, badges, subjects |
| `src/data/profiles.ts` | Mock students mirroring V2's High/Moderate/Limited columns + edge cases |
| `src/story/` | Viewer: progress, tap/swipe/hold/keys, transitions |
| `src/screens/` | One component per screen; 01–08 have no buttons by construction |
| `src/styles/tokens.css` | Primitives → surface roles (`cover` / `page` / `certificate`) → type, space, motion |
| `src/lib/motion.ts` | Motion tiers T0–T3, each with its reduced-motion equivalent |
| `src/screens/registry.tsx` → `SURFACE` | Which surface each slide sits on |
| `src/components/primitives.tsx` | `Stamp` (learner type), `BadgePill`/`CapstonePill` (stickers), `AssetPlaceholder` |
| `src/dev/DirectionBoard.tsx` | The direction board, rendered from the real tokens + components |
| `src/share/ExportCard.tsx` | 1080×1920 export. **Has no name/photo props, so privacy is enforced by its type** |

## Milestones
- [x] **M1 Functional foundation.** Story engine, conditional composition, Fresh Start, home banner states, share stub, dev controls, reduced motion, repeat view, small-device layout.
- [x] **M2 Visual direction (proposed, awaiting sign-off).** “তোমার খাতা”: the deck is one notebook. Navy cover board (01, 11, Fresh) → ruled paper pages (02–09) → certificate (10). Magenta typographic stamp for the learner type, reused on 09/10. Die-cut gold stickers for badges; the capstone is inverted navy+gold. Type scale with Bangla line heights. Motion tiers T0–T3. Screen *compositions* are unchanged from M1.
- [x] **M2b Screen 01 Cover (designed + entrance motion).** Left-aligned composition: mark → mascot band (flexes, shrinks first) → headline + gold ২০২৬ → journal label (নাম · শ্রেণি · বিভাগ, V2 labels) → support line. New reusable pieces: `components/JournalLabel.tsx`, `components/Entrance.tsx` (rise/fade/write beats, reduced-motion safe), `MOTION.entrance` in `lib/motion.ts`. Also fixed the close (×) button, which wasn't receiving taps (shared navigation).
- [x] **M2c Cover explorations: Bold & Energetic** (`?view=covers`). Three static Screen 01 directions on Shikho DS 1.1 tokens: A Typographic Impact, B Playful Geometry, C Editorial Celebration. Switch one into the live prototype with the dev panel's *Cover (01)* select or `?cover=a|b|c`; the default stays the current cover. Files: `src/explore/`. Year weight 800 and display sizes above Title 36 are a flagged extension of Baloo Da 2. Superseded by M2d; A/B/C kept as archive.
- [x] **M2d Cover: Your Year, Unfolded** (`?view=covers`, default view; `?cover=u` in the prototype). One art-directed static cover: an accordion-folded magenta sheet printed with ২০২৬, pleated at lower-left and opening to a flat panel off the right edge. Depth is fold geometry only (foreshortening, shear, darker DS step on turned faces); no shadows or 3D transforms. Files: `src/explore/CoverUnfolded.tsx`, `src/explore/unfolded.css`. Awaiting approval before animation (the unfold is the natural entrance). Archived (`?cover=u`).
- [~] **M3 Cover + Study Time (geometric system, animated)**. Default cover and 02 now use one flat-shape system (DS 1.1): Cover = Primary 600 ground, yellow dome holding the student line, magenta moon the year overprints; Cover→Study the dome swells into Study's yellow ground and the moon travels (bespoke transition in `StoryViewer`, forward only, full motion only); Study = count-up hours over the moon, blue dome with one yellow dot per 6-hour day (V2 comparison Y; omitted when V2 omits the comparison). Files: `src/screens/{CoverGeo,StudyGeo,geometry}.ts(x)`, `src/styles/wrap-geo.css`, `src/lib/sequence.ts`, `src/story/entry.ts`. Hours shown come from the dev sample profiles only. Settled screenshots + recording: `review/m3/`. Old covers: `?cover=m2|u|a|b|c`.
- [~] **Approved Figma Cover + animated Cover→Study** (Figma `th2CA9ugtc2BZixN4UBH3Z` node 10:274). The default cover is now the approved static design, built exactly to Figma: a Primary 900 ground, four cropped and rotated year digits (white ২ ০, magenta ২ ৬), and a centred stack with the student card. Motion ("moving canvas"): the four digits are one composition and are never animated one by one. Entrance (~1.4 s): the composition settles from 1.08 to 1.0 over 900 ms on one ease-out curve, with no spring. Then the headline and year rise through a mask, the invitation fades up, and the identity card arrives last. Cover→Study (~860 ms, navigation locked):
  1. The centre clears.
  2. Study Time's ground fills the stage between the digits.
  3. The camera pushes in, with one scale about the point where both inner edges leave the frame together. The mask edges stay pinned to the digits' inner edges.
  4. Study content starts once the ground is complete.
  Night sky (Figma update, nodes 20:514–20:541): blue centre glow, curve layers, 3 four-point stars and 7 particles (`src/screens/CoverSky.tsx`, assets in `public/assets/cover/`). The year is now Warning 500 and the ground #111b72.
  - Stars twinkle in place: opacity 35–100 %, scale 0.85–1.1, a 2.6–4.3 s period, and one glint cycle in three.
  - Particles breathe at 40–80 % opacity over 4.1–6 s.
  - All loops are sine-eased and phase-offset, and are off under reduced motion. Recording: `review/m4/cover-night-sky-twinkle-390x844.mp4`.
  Figma update (frame now 412×917):
  - The name/class card was removed. The cover now has a "শুরু করো" start control (label plus round arrow) that advances like a tap.
  - The corner digits float slowly in place (±4/±2 Figma units, a different period and phase each). They settle before the transition mask.
  - The start arrow's shaft stretches 1.5× and back every ~1.8 s. The head is never distorted (same asset, clipped twice).
  - All of this is off under reduced motion. Recordings: `review/m4/cover-390x844.mp4` and `review/m4/cover-360x800.mp4`.
  The shared keyframes are `REVEAL`, `stage()` and `stageMask()` in `src/story/entry.ts`. Reduced motion shows the settled cover and uses plain navigation. Files: `src/screens/CoverFigma.tsx`, `src/styles/cover-figma.css`, `src/story/entry.ts`, `StoryViewer`. Screenshots and recordings: `review/m4/`. M3 dome cover archived as `?cover=m3`.
- [~] **Screen 02 — the clock** (Nov 2026 brief). The default Study screen is now `StudyClock`. It shows the question "২০২৬ সালে কতটা সময় কাটিয়েছো শেখার পেছনে?" with its support line, above a 120cqw analog clock cropped by the bottom and side edges (`src/components/AnalogClock.tsx`, an SVG face plus three hand layers).
  - **Entrance:** the clock rises over 500 ms. The hands start at 300 ms, spin (seconds ~5 turns, minutes 2, hours 60°), decelerate and land on the real time at ~3.5 s. After that the second hand ticks every second, with minute and hour moving in proportion. Angles always increase, so nothing resets or jumps; motion values only, no re-renders.
  - **Shared sky:** the night sky is now one story-level layer (`src/story/NightSky.tsx`, `src/styles/night-sky.css`) behind Screens 01–02, whose slides are transparent. Twinkles never restart, and Screen 02 cross-fades in a slightly brighter glow.
  - **Hand-over (cinematic, ~1.5 s + reveal):** the four corner digits assemble into one centred, horizontal ২০২৬.
    - The centre content fades in 200 ms.
    - The digits travel from their measured on-screen positions (800 ms, one ease-in-out curve) while they straighten from their ±27.25° tilt and shrink to one size. They keep their weight and colours.
    - The year holds 200 ms, then scales to 1.5× and fades (400 ms). Screen 02 reveals during its last 200 ms.
    - Geometry is in `src/screens/assembleYear.ts`, timing in `SKY_HANDOFF`. Navigation is locked for ~1.8 s and the shared sky never restarts.
    - Assembly checked at 360/390/430: upright, one size, centred on the frame's midpoint within 0.1 px, with font-native spacing.
  - **Archived:** the M3 count-up screen is at `?study=geo`.
  - **Recordings and screenshots:** `review/m5/`.
  - **Refinement (Nov 18):**
    - Hand-over: the four original corner digits line up in one row (ink-spaced, one baseline, equal gaps, 80 % of the width), hold for 200 ms, then scale to 1.12× and fade. About 1.65 s; Screen 02 appears from about 1.45 s.
    - Screen 02 copy now follows V2/PRD:
      - The lead "এই বছর তুমি পড়েছ" sits at the top.
      - The hours count up in Warning 500, followed by ঘণ্টা.
      - The comparison line "দিনে ৬ ঘণ্টা ধরলে, প্রায় [Y] দিনের সমান।" appears only when meaningful.
      - The Nov question/support copy was removed (not in V2/PRD).
      - PRD's support line isn't shown, because V2 omits it.
    - The clock is 110cqw wide with only its top 66cqw visible (31 % less visible height than before).
    - Recordings and screenshots: `review/m7/`.
- [~] **Screen 03 — Live classes: "The Roll Call"** (Nov 22 rebuild, from the HTML prototype + three checkpoints). Files: `src/screens/LiveClass.tsx`, `src/screens/heroHandoff.ts`, `src/styles/live-class.css`. Signature Blue (central map). The V2 attendance screen remains at `?live=v2`. Replaces "The Front-Row Seat".
  - **Copy (PRD Screen 3, exact):** headline "লাইভ ক্লাসে তোমার উপস্থিতি"; primary "[X]টি ক্লাসে অংশ নিয়েছ তুমি" (number + "টি / ক্লাসে" + "অংশ নিয়েছ তুমি"; read whole by screen readers); the held total for context ("[Y]টি ক্লাসের মধ্যে", V2 line — PRD hierarchy: attended → ribbon → held); the ফার্স্ট বেঞ্চার ribbon only when earned (≥ 85%, `config.ts`). "নিয়মিত উপস্থিতি" has no configured criteria, so it never shows. No percentage. The prototype's eyebrow, footer and "LIVE" card are not used.
  - **Composition:** headline top-left; the count (yellow, with a yellow focus bar), then the statement, held total and ribbon — all on the darker upper part of the gradient; below, the classroom: four rows of one consistent chair geometry (backrest with a soft lip, seat, legs), each row further back smaller, higher and dimmer; the student's front-row seat (third of four) in Shikho yellow with a soft floor glow. At rest the rows are receded (0.6) and the hall stepped back; the yellow seat stays whole.
  - **02 → 03, one continuous entrance (≈ 1.8 s, `FLOW` in `entry.ts`):** the clock starts dropping under 02's text fade (0.04–0.46 s); the yellow seat rises from the same place straight to its resting spot (0.14–0.64 s); 01 classroom — the four rows establish as one arrangement (0.2–0.75 s), then dim as the hall steps back around the seat (0.62–1.12 s); 02 present — the seat's own beat (Nov 22, so it reads): its light comes up, it lifts once gently, a ring forms and holds ≈ 0.4 s, then widens away (0.8–1.9 s); 03 reveal — the count rises above the room and counts (1.3–1.8 s), then the statement, held total and ribbon. Taps locked 1.45 s. The live board and desk were removed (by request). One GSAP master timeline for the clock and the room; Motion for all text.
  - **03 → 04:** unchanged choreography (`focusHandoff.ts`): the rows and text leave, the yellow seat holds, then sinks as the spotlight comes up and the teacher appears.
  - **Robustness:** if Screen 03 is revived mid-exit (back from 04 within its hand-over), it snaps to the settled frame (`settleHall`).
  - **Review:** `review/m27/` (final at 360, 390, 430, 360 × 640, Moderate (no ribbon); 02 → 03 recordings at 360, 390 and 430 widths; 03 → 04 recording; 75 ms strips).
- [~] **Screen 04 — Teacher: "Teacher in the Spotlight"** (Nov 2026 brief). Files: `src/screens/TeacherSpotlight.tsx`, `src/screens/focusHandoff.ts`, `src/styles/teacher.css`. It sits on Soft Violet (central map). The M1 placeholder remains at `?teacher=v2`.
  - **Copy (PRD, unchanged):** "যাঁর ক্লাসে সবচেয়ে বেশি ছিলে" · [শিক্ষকের নাম]. The name is larger and is the priority; both lines sit in the upper part, clear of the background's bright band.
  - **Scene:** a navy veil dims the room. A warm, flat, two-layer beam falls from the top edge (fading in below the chrome and dissolving into the pool) onto a soft light pool, where the teacher stands. There are no props.
  - **Teacher visual (V2 chain):** a cleared photo shows in a circle with a Warning 500 ring. Otherwise (generic avatar or none) a neutral, top-lit navy bust silhouette is shown; no face is ever guessed. Mock photos show the silhouette until a cleared asset exists.
  - **Omission:** unchanged in `compose.ts`. No reliable teacher record, or the dev toggle off, means no slide.
  - **03 → 04 "focus shift"** (`FOCUS` in `entry.ts`; taps locked 1.5 s). One GSAP timeline drives 03's seats and 04's light and figure; Motion drives both screens' text:
    - 03's text and classroom fade by 0.4 s while the yellow seat holds.
    - The room dims from 0.2 s, and the beam opens from the top from 0.4 s.
    - The seat sinks away from 0.45 to 0.8 s as the pool forms from 0.6 s.
    - The teacher appears from 0.8 s, the framing line from 0.7 s, and the name rises last, from 1.1 to 1.65 s.
    - The background blends from Signature Blue to Soft Violet under it.
  - **Other entries:** entered any other way, the same entrance plays without the seat. Reduced motion shows the settled frame.
  - **Fix:** GSAP lag smoothing is off (`gsap.ticker.lagSmoothing(0)`) so the GSAP hand-overs stay on wall-clock time with Motion and the removal timers.
  - **Recordings and screenshots:** `review/m13/`.
  - **Teacher avatar (Nov 22):** the High profile's teacher is "এনাম ভাইয়া" with the supplied illustrated avatar (`public/assets/teacher/enam-bhaiya.png`, resized to 799 × 1000). New optional `teacher.portraitUrl` field; fallback order is portrait → cleared photo (ringed circle) → neutral bust. The Moderate profile uses the same name with no portrait, to keep the fallback testable.
  - **Portrait bust (Nov 19):** the generic avatar icon is replaced by an editorial bust: a three-quarter head, neck, shoulders and upper torso in a jacket with lapels, open collar and a pen in the breast pocket. No face and no gender cues.
    - Duotone: warm light on the head and shoulders, deepening into the room's violet; the torso fades into the background.
    - About 84 % of the screen width (70 % on short screens), rising from the bottom edge.
    - The beam is narrower, with a soft brighter centre, widening to the shoulders; a glow behind the shoulders replaces the floor pool.
    - The name is the hero (40–54 px); the framing line drops to 18 px. Copy unchanged.
    - The cleared-photo variant was re-placed for the new layout but not yet seen with a real photo.
  - **Refined as an emotional pause (Nov 19):** less data celebration, more human appreciation. Copy is unchanged; nothing was added.
    - **Pace:**
      - The seat lingers longer.
      - The light comes up slowly, like dawn rather than a switch, from 0.55 to 1.45 s.
      - The teacher appears with the framing line from 1.0 to 1.1 s.
      - A held beat of stillness follows, then the name fades softly into place from 1.75 to about 2.65 s.
      - Taps are locked for 1.9 s.
    - **Light:**
      - One warm beam with feathered sides (the hard core is removed).
      - A warmer pool.
      - A lighter veil: the room settles rather than going dark.
    - **Figure:** warm-lit (one continuous light gradient, melting into the pool) instead of a dark navy cut-out.
    - **Name:** warm white `#fff8ea`, with a soft fade-up instead of a mask snap.
    - **Recordings and screenshots:** `review/m14/`.
- [~] **Screen 05 — Quiz: "The Answer Parade — One Last Question"** (Nov 22 rebuild, from the three-state HTML prototype). Files: `src/screens/QuizRecap.tsx`, `src/screens/quizHandoff.ts`, `src/styles/quiz-recap.css`. Ocean Blue (central map). The V2 stat screen remains at `?quiz=v2`. Replaces the first Answer Parade (lettered discs), which was removed.
  - **Copy (PRD, exact):** headline "কুইজে কেমন কাটল তোমার বছর?" (broken before its last two words); statement "এই বছর [X]টি কুইজ শেষ করেছ" with the real count in Bengali numerals (read as one sentence by screen readers); milestone "আর [n]টা হলেই [মাইলফলক]" only when `compose.ts` finds a real gap; the V2 badge pill only when earned. The prototype's extra lines (selection note, "কুইজ শেষ!", sub-line) are not PRD copy and are not used.
  - **One set of elements, three states:**
    - 01 quiz: four answer rows A–D (letter chip, answer-text lines), slightly tilted; B is picked (yellow, a flat key shadow). A choice, never marked right or wrong.
    - 02 done: the answers square up into one stack, the pick on top; the quiz's progress bar fills; a small check: quiz finished.
    - 03 year: the stack fans out into four finished-quiz rails at the foot, each ticked done; the progress bar rises to become the count's underline; the yellow count is the focal point.
  - **Layout:** all text on the dark top two-fifths of the gradient (the count has a flat navy offset for edge contrast; the milestone sits in a navy chip); the rails take the light band, cropped at the right edge on one −7° axis.
  - **04 → 05 "Spotlight → Quiz"** (`ANSWER` in `entry.ts`; taps locked 1.0 s). One GSAP timeline drives 04's figure, light and veil and 05's deck, rows, bar and check; state colours are CSS transitions keyed by `data-qa`, set by the same timeline; Motion drives all text:
    - The teacher sinks out and the name fades; the beam stays, narrows, and answer A enters its light (0.35 s); B, C, D join as the light fades (hero ≈ 0.95 s).
    - 1.4 s the pick; 2.1 s the stack, bar and check; 3.45 s the fan-out, underline, statement and count; settled ≈ 4.6 s. No loops.
  - **Other entries:** the same sequence without the light. Reduced motion and repeat views show state 03, still.
  - **Recordings and screenshots:** `review/m18/` (full sequence at 390 × 844 and 360 × 800; 200 ms frame strips; final state at 360, 390, 430, 360 × 640, the badge case and reduced motion).
- [~] **Screen 06 — Video: "The Watchline"** (Nov 22, reproduced from the V3 reference image: three connected states). Files: `src/screens/VideoWatchline.tsx`, `src/screens/VideoPlayer.tsx`, `src/screens/watchHandoff.ts`, `src/styles/video-watchline.css`. The V2 stat screen remains at `?video=v2`.
  - **States (one DOM, one Motion sequence, ≈ 3.2 s):**
    - 01 play: eyebrow + two-line heading; the lesson player card (identity label, atom diagram, play button centred on the nucleus ring, control bar with time and controls); supporting copy.
    - 02 accumulate: eyebrow + heading; three tilted, overlapping lesson cards (label, play ring, watched bar); the shared watch line with its caption and time marks.
    - 03 reveal (resting): "ভিডিও দেখে শিখেছ", the minutes (yellow hero) + "মিনিট", the watchline with its label, four playback tiles (the last yellow), the comparison under a divider; the V2 badge when earned.
  - **Shared elements:** Screen 05's underline becomes the first card's playback line. Each video is ONE card (`VideoCard`) that morphs continuously through three looks — big player → medium lesson card → small tile — interpolating its box, corner radius, tilt, shadow, play control (solid button with yellow ring → outline ring → bare triangle), watched bar (insets, fill, then fade), detail layers and tile colour, so nothing swaps mid-move (Nov 22 fix for the "jumping"). Its tile look is identical to the real tile, so the final hand-off is invisible. The shared line rises into the year's watchline.
  - **Copy (PRD only, Screen 6):** the heading "ভিডিও দেখে শিখেছ" leads from state 01 and stays; the minutes complete "ভিডিও দেখে শিখেছ [X] মিনিট"; the comparison "১২০ মিনিটের সিনেমা ধরলে, প্রায় [Y]টি!" when meaningful; the earned recognition (ভিডিও ম্যারাথনার, V2). PRD hierarchy: minutes → comparison → recognition. The reference image's other lines (eyebrows, state headings, captions, card labels, time marks, labels) were removed on Nov 22; text-like details inside the cards are placeholder bars. Per the PRD's "can't be mistaken for a real metric", only the minutes are yellow — the comparison's count is white. Note: the V2 brief revises the comparison to hours ("প্রায় [Y] ঘণ্টা ভিডিওতে শেখা।"); this screen follows the PRD line, as requested.
  - **Background:** the section's Gentle Atmosphere variant (Signature Blue, `background.ts`) — no screen-level override or decoration (the reference's arc strokes were removed Nov 22; pixel-identical to Screen 03's Signature Blue). Polish over the reference: play button centred on the nucleus ring; masks with headroom so Bengali ি/ী strokes never peek; headings hand over without overlapping.
  - **Timing (`WATCH` in `entry.ts`):** 01 from 0.1 s (holds to 1.1 s) → 02 from 1.1 s (holds to 2.35 s) → 03 from 2.35 s; minutes count from 2.5 s; settled ≈ 3.2 s. Navigation stays responsive (150 ms double-tap guard only). Reduced motion / repeat view: state 03 at once. `?freeze=<s>` (dev only) holds the sequence for state screenshots.
  - **Review:** `review/m26/` (PRD copy: the three states and the final). `review/m25/` ( the three states, final at every size, recordings at 390 × 844 and 360 × 800, 75 ms strips of both morphs). Earlier: `review/m24/` (reference build with its own ground), `review/m19/`, `m21/`, `m22/`, `m23/`.
- [~] **Cover → 02 hand-over: digits leave outward** (Nov 22). Replaces the regroup into one row (the old `assembleYear` was removed). ≈ 0.85 s, overlapping (`SKY_HANDOFF` in `entry.ts`): the centre content fades and lifts 10 px (0–0.32 s); each corner digit moves straight out from the frame centre just far enough to clear its own edges, scaling to 1.04 and fading (0–0.62 s); the background drifts from the cover ground to Ocean Blue (0.8 s); Screen 02's clock rises, its headline fades up and the yellow number reveals (from 0.28 s). Taps locked 0.7 s. Forward, back, rapid taps and reduced motion checked. Review: `review/m28/cover-to-study-*.mp4`, `cover-to-study-100ms.png`.
- [~] **Cover opening: cluster → corners** (Nov 22). Cover only; final layout unchanged. The four digits open as one compact, upright 2 × 2 cluster of ২০২৬ in the centre (white ২০ over magenta ২৬; `clusterYear` in `assembleYear.ts`, measured from the glyphs' ink, 6 % larger than the corners), fade in over 0.35 s, hold to 0.5 s, then open out together to their approved corners in 1.0 s (30 ms stagger, one in-out curve, easing slightly down in size and into their tilt). The bird fades/scales in at 0.85 s, the title rises at 1.0 s, the line at 1.22 s, the start control at 1.42 s; the ambient float starts at 1.6 s. Lands pixel-exact at 360/390/430. Cover → 02 hand-over unchanged. Review: `review/m28/` (opening recording, 100 ms strips, cluster at three widths).
- [~] **Cover background test** (Nov 22). Cover only; nothing else changed. Two grounds in `background.ts`: **Deep Indigo** `#101553 → #202A91 → #364CBE` (preferred, default) and **Soft Blue** `#171C68 → #344AB8 → #769CEC` (`?coverbg=soft`); the third colour holds from the 75 % stop. On both, a soft radial darkening sits behind the centre stack (`.cf-scrim`, fades with the content on the hand-over to 02) and a faint cool light behind the bird (`.cf-bird-light`). Measured contrast at 390 px (white title / support line / CTA label; bird body vs ground): Deep Indigo 11.6 / 9.8 / 7.4, bird 1.84; Soft Blue 6.7 / 4.7 / 2.9, bird 1.24; old Signature Blue 5.3 / 4.0 / 2.9, bird ≈ 1.0. Side by side on the review board (`?view=direction`, section 0) and in `review/m28/`.
- [~] **Screen 07 — Subject of the year: "Subject Takes Over"** (Nov 22, from the HTML prototype). Files: `src/screens/SubjectTakeover.tsx`, `src/screens/subjectArt.tsx`, `src/styles/subject.css`. Soft Violet (central map; the prototype's own backdrop and cyan wash are not used). The M1 placeholder remains at `?subject=v2`.
  - **Copy (PRD Screen 7, exact):** "তোমার বছরের বিষয়" · [বিষয়ের নাম] · "এই বিষয়েই তুমি সবচেয়ে বেশি সময় দিয়েছ এই বছর।" (`COPY.subject.prdHeadline/prdSupport`). The prototype's "SHIKHO · WRAP 2026" and "PHYSICS / 2026" labels are not used. Subject = most time (compose.ts), omitted when missing or tied.
  - **Composition (Nov 22 update):** headline top-left; the subject name as the hero on ONE line in Shikho yellow (design size min(13.1cqw, 51px), fitted down per name only if it would overflow — measured at the design size); a yellow underbar; the subject's original Shikho icon centred below as the main visual; the supporting line at the foot.
  - **Subject icons (`SUBJECT_ICON` in `subjectArt.tsx`):** the original Shikho subject icons from Figma "Report Card Revamp (W)" → "Subject Icon" (EkzF4RDp1YaveGsvKJKCde, 2619:20376), one per project subject (physics → "Physics", the Saturn icon; math → "General Math"; chemistry, biology, higherMath → "Higher math", bangla, english, ict). Files in `public/assets/subjects/` are each component's own vector layer exported unchanged (40 × 40, original colours and gradients); only the page/frame backgrounds the export wrapped around them were removed. The hand-drawn atom and fallback art were removed. `longName` test profile has উচ্চতর গণিত as its top subject.
  - **The Subject Shuffle Deck (Nov 23; replaces the Subject Spin drum):** from `shikho_subject_shuffle_comparison.html`, mode "01 · Shuffle Deck" only; the Full-Screen Drum mode is not used.
    - **Kept from the reference:**
      - Five lanes, 160 % wide and 13 % tall, from 16 % down every 14.7 %, with alternating tints, hairline edges, ✧ separators and the lane type (800, 28–47 px, #f4edff).
      - Each lane's tilt, spread, alternate left/right drift on a cubic ease-out, and start blur.
      - The straighten-and-contract to 0.88 (0.95–1.6 s), and the other lanes clearing with blur (1.28–1.7 s).
    - **Changed:**
      - Lanes hold the student's own subjects only.
      - Each lane stops at a slightly offset time (1.42–1.6 s) instead of all at 1.5 s.
      - Lanes fade in over 0.25 s, so they don't sit over 06's text.
    - **Selection (exact, not random):** the middle lane holds the student's subject. Its end position is computed from that word's offset in the lane, so the word stops exactly at the title's left edge.
      - The rest of that lane clears with the other lanes; the word stays.
      - At 1.62 s, once the lane has stopped and straightened, the real title (`.sb-title`) is placed over the word at the same position and size. Scale and offset are measured from both boxes; the word uses the title's letter-spacing and the title starts in the lane's colour and opacity. The word hides in the same frame.
      - The same title then moves and scales into its headline position (1.7–2.2 s). It turns Shikho yellow only then (1.75–2.1 s).
      - The underbar draws left → right once the title has arrived (2.1–2.42 s).
      - The headline (1.95 s), the Shikho icon (2.05–2.5 s) and the support line (2.2–2.5 s) follow.
    - **Implementation:** one GSAP tween drives the deck and the title; the reveal is a Motion sequence. The timings are in `TAKEOVER.deck` in `entry.ts`. With one subject there is no deck.
  - **06 → 07:** 06's watchline now fades with 06's text (0–0.2 s) instead of becoming the underbar, so no underline shows mid-scroll. Screen 06 itself is unchanged. Other entries behave the same. Reduced motion shows the final frame. If the slide is revived mid-exit (rapid taps), it snaps to the final frame.
  - **Review:** `review/m29/` (final at 360, 390, 430, 360 × 640; Moderate = গণিত fallback; longName = উচ্চতর গণিত; 06 → 07 reel recordings at three widths; reel cruise/settle strips; settled reel at 360 for three subjects). `review/m30/`: all eight subjects at 360 × 800 (one line, original icon), Physics at 390 and 430, short frames, reel recordings. `review/m31/`: centred reel + shared-title lift. `review/m33/`: the Shuffle Deck → title hand-over at 360/390/430 and 360 × 640, reduced motion, rapid taps, contact sheets.
- [~] **Screen 08 — Most-active day: "The Day That Lit Up"** (Nov 23, from `shikho_most_active_day.html`). Files: `src/screens/PeakDayLit.tsx`, `src/styles/peak-day.css`. Ocean Blue (central map; the prototype's violet ground is not used). The M1 placeholder remains at `?peak=v2`.
  - **Copy (PRD Screen 8, exact):** "তোমার বছরের সেরা দিন" · [তারিখ] · "এই দিনেই তুমি সবচেয়ে বেশি সময় কাটিয়েছ শিখোতে।"; optional "সেদিন [X] ঘণ্টা শিখেছ।" only when that day's time is known and ≥ 1 h. Not used from the prototype: its intro line, month hint, "SHIKHO · 2026" label and closing note (not PRD).
  - **Data:** the single day of most time on Shikho (`peakDay` in the activity record). compose.ts omits the slide when there is no clear peak. `peakDay.seconds` may now be null: the date is still shown and the time pill is omitted.
  - **Calendar:** built from the real date: month name, year, the month's length and its first weekday (Sunday-first heads, as in the reference). The day is highlighted in Shikho yellow.
  - **Composition:**
    - The headline sits top-left.
    - The hero date: the day in Shikho yellow (min(25.6cqw, 12.6cqh)) over the month in white (min(12cqw, 5.6cqh)), then a yellow underline.
    - The calendar card at 46 % uses the reference's card in this section's blue, so the dates hold contrast over the light band.
    - The support line and the time pill sit at the foot.
  - **Entrance (Nov 23 continuity fix; one step-capped rAF clock, ≈ 1.8 s; timings in `DAYLINE`, `entry.ts`):** the earlier month morph (chip turning yellow, the month name flying into the hero, the calendar rising and tilting, the day flying out of its cell) was removed.
    - **Months (0–0.75 s):** already moving, they ease down along one smooth speed curve (v₀·(1 − smoothstep)) and stop on the date's month with no brake point. They pass 4 months.
    - **One month name (0.65–1.0 s):** the other months fade back, and the month's card and number fade. Its name stays and glides into the calendar's header.
      - The header month takes the chip label's exact place, measured, and the label hides in the same frame. There is a small scale (≈ 0.8×) and no recolour beyond chip ink → white.
      - The year fades in beside it (0.9–1.1 s).
    - **Calendar opens (0.85–1.25 s):** the header band appears, then one clip edge sweeps the card and its dates downward. The header is never clipped, and there is no rise, tilt or scale; the dates appear as the edge passes.
    - **Day (1.1–1.35 s):** it lights up in its own cell and stays there.
    - **Large date (1.25–1.7 s):** a masked reveal, day then month, starting low enough that Bengali signs never show early. Then the underline (1.52–1.78 s) and the support line (1.45–1.8 s).
    - **Resting frame:** pure CSS; the entrance clears its inline styles when done. Taps are locked for 1.1 s.
    - **Smoothness (Nov 23):**
      - The clock is a rAF loop whose step is capped at 1/40 s, so the long first frame (mounting the slide) or a dropped frame never makes the motion jump ahead. This replaces the GSAP tween, which runs with lagSmoothing(0).
      - The calendar opens behind a soft 28 px mask edge instead of a hard clip.
      - The card's shadow is its own layer and only fades in.
      - Measured under 4× CPU throttling: the longest frame went from 151 ms to 22 ms.
  - **07 → 08:** 07's subject, icon and support clear (0.2 s), and its yellow underbar stays. The bar stretches to the frame's width and drops under the month chips, becoming their rail (0.04–0.46 s). Only Screen 07's exit was touched (`SubjectTakeover.tsx`); its design and Shuffle Deck are unchanged.
  - **Other entries:** back navigation and jumps play the same entrance without the hand-over. Reduced motion shows the final frame. If the slide is revived mid-exit (rapid taps), it snaps to the final frame.
  - **Review:** `review/m34/`: final frames at 360, 390, 430 and 360 × 640, plus Moderate (৯ জুলাই); 07 → 08 contact sheets; rapid taps. `review/m35/`: the continuity fix, with checkpoints at 25/50/75 % and the measured March hand-over. `review/m36/`: the smoothness pass.
- [~] **Screen 09 — Learner type: "The Big Reveal"** (Option A layout and motion; Warm Violet ground) (Nov 23, from `shikho_learner_type_big_reveal.html`; Option B is not used). Files: `src/screens/LearnerReveal.tsx`, `src/components/LearnerBadge.tsx`, `src/styles/learner-reveal.css`. The M1 screen remains at `?learner=v2`.
  - **Copy (PRD Screen 9):** "তোমার শেখার ধরন কী?" · "সারা বছরের শেখার অভ্যাস দেখে তোমার জন্য আছে একটি বিশেষ পরিচয়।" · [শিক্ষার্থীর ধরন] (server-assigned, compose.ts; "balanced" is the fallback). The line under the type is its data-tied reason (`LEARNER_TYPES`), and the small label over it is the existing `COPY.learnerType.label`.
    - Not used from the reference (not PRD): the eyebrow "SHIKHO WRAP · ২০২৬", the vertical "WRAP 2026" / "SHIKHO" watermarks, "তোমার শেখার পরিচয়", its demo reason and the DEMO hint. The header is moved down by the eyebrow's height, so the question sits where it does in the reference.
  - **Actions:** "আমার মার্ক শিট দেখি ↗" → Screen 10 (`actions.next`); "শেয়ার করো" → the existing share sheet (`actions.share("type")`). Nothing is simulated.
  - **Ground (Nov 23): Warm Violet**, from Figma "B — Warm Violet" (th2CA9ugtc2BZixN4UBH3Z, 103:731), via the shared background (`SCREEN_BACKGROUND.learnerType = "warm-violet"`). The reference's magenta flood is no longer used; the slide is transparent.
    - Colours: 180°, #432684 0 % · #7652bc 28 % · #b69bd8 49 % · #53318c 86 %. Sampled renders match Figma exactly at every stop.
    - The background system now takes per-variant stop positions (registered `--ga-p1…p3`, which glide with the colours) and a per-variant decoration layer.
    - Warm Violet uses its frame's own exported decorations (`public/assets/backgrounds/warm-violet-decorations.svg`: a 10 px star at 375,248 and a 4 px particle at 26,470) in place of the shared star and particles. The two layers cross-fade with the colours.
    - No other screen's background changed.
  - **Restrained:** no rings, tick marks, accent strokes, sparks, corner outlines or centre glow; the badge has a quiet contact shadow only.
  - **Layout (Nov 23):**
    - The name tag (label, type, reason) sits directly below the badge: it is anchored to the badge's bottom edge (`--lt-badge-bottom`), 2.4cqh under it (1.6cqh on short frames), at every size.
    - The badge's contact shadow sits at its foot.
    - The two actions are pinned to the bottom of the frame (`max(20px, 3.6cqh)`; short frames `max(14px, 2.6cqh)`).
  - **Badge:** `LearnerBadge` is one component. Every type shows the reference's dummy shield for now. When the Figma badges arrive, add each type's file to `BADGE_ART` and nothing else changes. The art fills a 204 : 224 box, so its aspect ratio holds through every transform.
  - **Reveal (≈ 1.65 s):** the reference's own progress map, unchanged:
    - the badge falls in from above, blurred, tilted 14° and 1.37× → sharp, upright and at rest (.18–.59);
    - one shine sweep (.55–.9; eased in and out, where the reference switches it on and off);
    - the identity rises (.53–.79), then the actions (.71–.94).
    - It runs on the same step-capped rAF clock as Screen 08. The resting frame is CSS. It plays once per visit; reduced motion and repeat views show the final frame, and a slide revived mid-exit snaps to it.
  - **Review:** `review/m37/`: final frames at 360, 390, 430 and 360 × 640, side by side with the reference; mid-reveal frames at matching progress; reduced motion; share sheet, primary action and rapid taps. `review/m38/`: the restrained ground. `review/m39/`: the Warm Violet ground next to the Figma frame, at 360, 390, 430 and 360 × 640.
- [~] **EXPERIMENT — "Bird Journey" opening and closing** (Nov 23; dev-only alternative). The approved Cover (`CoverFigma`) and Closing (`Close`) are untouched.
  - **Switch:** in the dev panel, "Opening & closing: Current | Bird Journey". It is persisted with the dev settings; `?journey=bird` also works.
    - **Current:** the approved screens and behaviour, including the cover → 02 hand-over.
    - **Bird Journey:** swaps only Screens 01 and 11. The story background under them becomes Reference 02's Soft Violet. The cover uses a normal exit, because the approved hand-over belongs to the approved cover.
    - The student-facing default is always "Current"; the switch lives only in the prototype's dev shell.
  - **Sources:** Figma Smart Class (R) `ymvbwOoxZvLjuM6S23QJ8l`.
    - **Reference 01 (980:1332):** the flying bird (980:1341), the #cce5fc sky, three clouds and the cloud bank (`public/assets/journey/`).
    - **Reference 02 (980:1442):** the resting bird (980:1538) and the cover composition.
  - **Pass 1, assets (`src/journey/birdParts.ts`):** both bird exports are split into movable layers (body, head, front, wingL, wingR, tail, marks, plus the flying pose's wing-beat strokes). Path data and fills are Figma's own, in the exports' own paint order; nothing is redrawn.
    - **Verified:** the rebuilt poses render identically to the Figma SVGs (`?view=bird`). The resting pose differs only by antialiasing, the flying pose by a half-pixel offset.
    - **Rig (`BirdCharacter.tsx`):** both poses in one box, registered on the head. The resting pose is scaled to the flying head's size (73 / 51), so a turn is an aligned swap, never a jump.
    - **Wing seam fix (Nov 23):** on the flying pose the left wing met the torso edge-to-edge, 0.5 units apart along x ≈ 79–85, y ≈ 66–122. That left an antialiased hairline at rest, and a gap of background in the downstroke, because the wing turned about (83, 97), low in the joint, so its upper root swung off the body.
      - **Pivot:** the wing now turns about the top of the joint, (80, 70), so its root stays on the body.
      - **Hidden overlap (`UNDERLAY`):** the torso's own path, stroked 9 units wide in its own blue, clipped to the joint band (x 60–90, y 72–124) and painted behind the torso. It is hidden under the wing at rest and fills any opening in motion. No new artwork.
      - **Verified:** at rest the joint matches Figma (minus its hairline); at −12° and −24° and in live flight there is no gap and no edge. The right wing joint was already clean and is unchanged. `?view=bird` shows the seam check.
  - **Pass 2, flight (`flight.ts`):** one shared state (speed, amp, pitch, trail, beats, fold, climb), turned into motion each frame by one `gsap.ticker` callback.
    - **Wings:** rotations about the shoulders. The frequency rises with speed (1.6 → 4.6 Hz), the downstroke is quicker, and the right wing lags slightly.
    - **Body and tail:** the body rises on each downstroke and leans with acceleration; the tail lags.
    - **Wing-beat strokes:** Figma's own strokes, flicking as the wings top out.
    - **Airflow:** three light SVG streams flowing down from under the wings and the tail. Their length, flow and opacity follow speed.
    - **Clouds:** parallax at different depths, re-entering at the edges to keep the middle clear.
    - No filters, blur, glow, 3D or particles.
  - **Pass 3, cover (`ExperimentalBirdJourneyCover.tsx`):** one GSAP timeline, ≈ 3.95 s.
    - **Flight:** a speed profile (already climbing, a slight mid-way surge, a long smooth slow-down) moves one year track: ২০২০ → ২০২৫ pass downward in order.
    - **Arrival:** ২০২৬ lands at the bird's own height, and the earlier years fade. The sky turns to violet and the clouds thin out.
    - **Turn:** ২০২৬'s four digits burst outward to Reference 02's corners (from the marker, never across the bird). The wings fold to the body, and the pose swaps over 0.12 s while the bird settles into the cover's bird slot. The title rises, then the support line and the start control.
    - **Verified:** the final frame matches Reference 02 (the bird slot at 161.2, 268.6 vs Figma's 161.16, 268.38; the CTA at 176, 633). On short frames the bottom digits crop further to clear the control.
    - **Skip:** tap during the intro to land on the cover. Reduced motion and repeat views show the static cover.
    - **Ambient, once settled (full motion only, loops; Nov 23):**
      - **Digits:** the four corner digits float exactly like the approved cover's (its FLOAT values: ±4 / ±2 Figma units, own periods, never in step). The start arrow stretches like the approved cover's.
      - **Blinks:** the resting bird blinks every 2.2–4.8 s, about a quarter of them double blinks. Its eyes are sub-groups of the head layer (`EYES`), closing about their own centres.
      - **Hop:** every 4.2–7.4 s the bird gives a sudden little hop: anticipation squash, a 15 px spring, the landing squash, settle. Its excitement ticks pop as it leaves the ground.
      - **Measured:** blinks close to 8 % of eye height; hops reach −15 px with a 0.92 squash; the digits float ±1.9 / ±3.8 px at 390.
  - **Closing v2 — "The Journey Continues" (`ExperimentalBirdJourneyClosing.tsx`, Nov 23; replaces the first experimental closing):** one master GSAP timeline, ≈ 2.2 s.
    - **Pose 03:** the three-quarter rear bird (Figma 981:1693), split like the others and verified against its export (75 px of antialiasing).
    - **Head registration:** all three poses share it (`HEAD`, `poseBox`). Each is placed around one head-centre anchor at one head width, so the front → rear turn happens in place at one size.
    - **A, marksheet exit (0–0.45 s):** Screen 10's card clears in three groups, sinking back: the pairs, then the hero block and stickers, then the identity, with the badge a beat later. Its ink ground opens onto Soft Violet.
      - Screen 10 is touched only in Bird Journey mode, and only in its exit: it stays mounted 0.5 s for entry kind "onward". If the closing stops early, it restores 10's styles.
    - **B, the Cover world (0.08–0.75 s):** Reference 02's four year digits slide back in from their corners, with its decorations. The front-facing bird lands in the cover's bird slot. No headline, support line or start control.
    - **C, the bird notices ২০২৭ (0.68–1.37 s):** the pupils shift up-right and the head tilts about the neck. The body turns with an aligned 0.12 s swap to Pose 03. Its wings open a little from just-folded, and the tail answers.
    - **D, the camera (0.72–1.6 s):** one camera value moves the world layers at their depths: decorations 0.5, year digits 1.25, ২০২৭ 0.9.
      - ২০২৬'s digits move out behind as ২০২৭ (in the same world, above-right) comes in from where the bird looks.
      - The bird stays in frame, settling centre-left and growing to 1.34× during the camera move, not during the turn.
      - The story chrome never moves.
    - **F, copy (1.45–2.15 s):** the PRD closing line (exact; "২০২৭-এ" kept on one line), then the approved actions (`COPY.close`).
    - **Final:** ২০২৭ upper right (clear of the close control), the rear bird centre-left facing it, the line and actions below.
    - **Idle, once settled (Nov 23; full motion only, stops on leave):** one gsap.ticker drives the wings, so the constant stir and the occasional flaps add up rather than compete.
      - **Breath:** the bird rises and falls 1.5 px.
      - **Wings and tail:** the part-open wings flutter ±2.5° and the tail sways ±2.5°.
      - **Blinks:** every 2.4–5 s, about a quarter of them double.
      - **Eager moment:** every 4.5–7 s, two quick flaps (up to 14°) and a 7 px lift, with the excitement ticks popping. Ready to go, never leaving.
      - **Measured:** blinks at 0.45, 3.27 + 3.53 and 6.67 s; eager flaps at 1.5 and 7.4 s.
    - **Rear-pose wing seam (Nov 23):** the far wing met the back edge-to-edge along (57, 72) → (47, 104), and raising it about (60, 82) opened a wedge at the lower root. Same fix as the flying pose:
      - **Pivot:** at the bottom of the joint, (48, 103).
      - **Hidden overlap:** a back-blue underlay (its own path, stroked, clipped to the joint band).
      - **Verified:** clean at 0°, 8° and 15.5°; at rest it matches Figma minus its hairline. `?view=bird` shows both seam checks.
    - **Checked:** frames at 0/25/50/75/100 %; 360, 390, 430 and 360 × 640; reduced motion; back/forward and rapid taps. Current mode still shows the approved Close.
  - **Pass 5:** checked at 360, 390, 430 and 360 × 640 in both modes, with reduced motion, skip and rapid taps; no errors. Review images are in `review/m43/`.

- [~] **Screen 10 — Marksheet: "Chapter Bento"** (Nov 23; no HTML reference, built from Screens 01–09's own visuals).
  - **Files:** `src/marksheet/Bento.tsx` (the card), `src/marksheet/art.tsx` (the memories), `src/screens/MarksheetBento.tsx` (in-app), `src/styles/bento.css`, `src/styles/marksheet-screen.css`, and `src/marksheet/BentoLab.tsx` (dev: `?view=bento&p=<profile>`; add `&v=a` for one card at native size). The M1 sheet remains at `?marksheet=v2`.
  - **Copy (PRD Screen 10):**
    - Headline "তোমার ২০২৬, এক খাতায়", set as the year statement: তোমার / ২০২৬, / এক খাতায়.
    - Closing line "দারুণ একটা বছর কাটিয়েছ — ২০২৭ হোক আরও বড়।".
    - Actions "শেয়ার করো" and "এগিয়ে যাও"; the privacy note "কার্ডে তোমার নাম, স্কুল বা র‍্যাংক থাকে না।".
    - Tile words reuse existing copy: the marksheet row labels, and the PRD headlines of 07, 08 and 04.
  - **Data:** `MarksheetFacts` (compose.ts) holds a typed fact for each chapter the story actually had (null when omitted), the learner type with `assigned` (false for the "balanced" fallback, so no badge), the earned badges and the capstone. It has no name, photo, school or rank fields.
  - **Asset audit → memories (no new illustration):**
    - 02: the AnalogClock face and hands (static, 10:09:36).
    - 03: the Roll Call hall from LiveClass's exported geometry, with the yellow front-row seat.
    - 04: the teacher's portrait in the spotlight, only when a portrait exists.
    - 05: the A/B/C/D final rails.
    - 06: the player (orbit art, play disc with the yellow halo, watched line).
    - 07: the original subject icon.
    - 08: the real month, the day lit.
    - 09: `LearnerBadge` (replaceable).
  - **Explorations** (`review/m42/explorations/`):
    - **A, Chapter Bento:** ink ground; each tile in its own chapter's Gentle Atmosphere colours; identity across the top. **Selected** for shareability, legibility at 360 px wide, the clearest "every chapter returns" read, and the cleanest adaptation.
    - **B, Medal & Ledger:** Warm Violet field with the badge as the medal; its chapters become a low-contrast, even ledger.
    - **C, খাতা Page:** a ruled notebook page with the chapters pasted in at angles; charming, but busier at small sizes, and the light ground breaks from the story.
    - From B: a tall identity tile becomes a centred medal layout.
  - **Layout (A):** six columns.
    - **Identity:** the top row. It takes the height the chapters leave and scales its contents with it (cqh). When tall (few chapters) it switches to the centred medal layout.
    - **Stickers:** an earned-badge strip, only when earned; the capstone leads it, inverted navy/gold.
    - **Hero block:** the clock tall on the left beside two major chapters.
    - **Pairs:** the rest, with the subject 2 + 4 and the others 3 + 3; a lone tile spans the row. No empty tiles and no fillers (`layoutA()`).
    - **Fitting:** one-line words (subject, teacher, date, type) are fitted to their box by measurement.
    - **Verified:** the High, Moderate, Limited, Capstone, longName and noLive cards.
  - **Export:** `ExportCard` kind "marksheet" renders the same `BentoCard` at 1080 × 1920; no story chrome or buttons. The share sheet (the Android stand-in) previews exactly that.
    - **Privacy:** verified in the DOM. The export has no student name, class or group; its only images are the teacher portrait, the subject icon and the logo.
    - **Native:** native rasterises the same component.
  - **In-app:** the card is the export, scaled to the space between the progress bar and the actions. The privacy note and actions sit on a quiet ink scrim (white text above ~4.5 : 1). Checked at 360, 390, 430 and 360 × 640.
  - **09 → 10, assembling the year (`ASSEMBLE`, ≈ 1.2 s):**
    - 09's text and actions clear; its badge is the shared element. It flies from 09's place into the identity tile, which establishes around it.
    - The chapters follow in three groups: stickers and the hero block, then the pairs, then the foot. The actions come last.
    - Only 09's exit changed.
    - Other entries: the same assembly with the badge settling in place.
    - Reduced motion and repeat views show the final frame; rapid taps revive to it.
  - **Review:** `review/m42/`: the three explorations; the exports at 1080 × 1920 for six profiles, plus at 360 px wide; in-app at four sizes plus Limited; the share sheet; the 09 → 10 assembly.

- [x] **Glyph clipping fix (Nov 23).** Text in reveal masks (`overflow: hidden`) was cut: the tops of ি / ী / reph, and the right edge of wide numerals (03's count, e.g. "৬০", "১১").
  - **Cause:** the masks' headroom was in `em` of the mask itself, which inherits a small size (≈16 px), not the large text inside.
  - **Fix:** each mask now gets room in units of its own text size (`--m`) above and to the sides, cancelled by equal negative margins, so nothing moves. Masks covered:
    - 01: `.cf-mask`; its waiting text now starts at 150 %.
    - 03: `.fr-line`, `.fr-num-mask`, `.fr-unit-mask`, `.fr-tail-mask`.
    - 05: `.qa-head`, `.qa-line`.
    - 06: `.vw-head`, `.vw-mask`.
    - 08: `.pd-mask`.
  - **Verified:** every screen's final frame was rendered normally and with all clipping disabled, then diffed. All are clean at 360, 390, 430 and 360 × 640 and for the High, Moderate and longName profiles. The before/after renders differ only by the recovered ink.
  - **Exceptions:**
    - 04's beam is clipped on purpose.
    - 10's (pre-redesign) card meets its scroll area at 360 × 800; no text is cut.
  - **03:** the yellow vertical bar beside the count (`.fr-focus`) is removed.
- [~] **Gentle Atmosphere background system** (Figma 55:38, Nov 2026). It replaces the night sky: the old orbital lines, glows, stars and particles were removed (`NightSky`, `night-sky.css` and 14 SVG layers deleted).
  - **Files:**
    - `src/story/background.ts`: every Figma value, the screen → background map (`SCREEN_BACKGROUND`), and transition lengths.
    - `src/story/StoryBackground.tsx`: the component.
    - `src/styles/gentle-atmosphere.css`.
  - **Variants:** `signature-blue`, `ocean-blue`, `soft-violet` and `periwinkle`. Each is a 180° four-stop gradient (0/35/75/100 %) plus the shared decorations: one four-point star and two particles, white at Figma opacity.
    - The decorations twinkle by opacity only, very gently, and stop under reduced motion.
    - Each decoration can be turned off on its own (`decorations` prop).
  - **Story:** one persistent layer behind every slide, never remounted. Its colours interpolate in place (registered CSS colour properties), so any variant can go to any other with no flash. Transition timing follows how the story moved:
    - Cover → 02: about 1.45 s.
    - 02 → 03: 0.65 s, with the clock drop.
    - Any other step, back or jump: 0.6 s.
  - **Screen map:** banner and Screens 01, 03, 06 and 11 Signature Blue; 02, 05 and 08 Ocean Blue; 04 and 07 Soft Violet; 09 Warm Violet (Figma 103:731); 10 and Fresh Start Periwinkle. To change one, edit `SCREEN_BACKGROUND` only.
  - **Screens 04–11 and Fresh Start:** they now use light-on-dark text roles (`SURFACE` all "cover"; marksheet "certificate"). Placeholder foregrounds are otherwise unchanged. The home banner has the background fitted to its card.
  - **Archived explorations:** the old `?cover=` explorations keep their own grounds.
  - **Validation (`review/m12/`):**
    - The four renders match Figma: identical at every stop, mean difference 0.48/255.
    - All journeys (High 11, Limited 7, Fresh 2) were walked with their backgrounds.
    - Transitions stay within their endpoint colours.
    - The review board (`?view=direction`, section 0) shows every screen on its background.
  - **Open, contrast:** the gradients' light band (about 55–85 % of the height, brightest at the 75 % stop) takes white text below WCAG. The worst cases:
    - 02's yellow number: 2.05:1.
    - 02's comparison line: 2.4:1.
    - Placeholder support lines on 05, 07, 08, 09 and 10: 1.7–3:1.
    - Needs a design decision; not patched in code.
- [ ] M3 Anchor screens (01, 02, 09) · M4 Remaining screens · M5 Marksheet & export · M6 Motion polish · M7 QA & handoff

## Needs product clarification
- **Unset thresholds** (`TBD` in `config.ts`): study-time min_show, attendance min_show, the "meaningful" bar for the school-day and video-hours lines, subject-tie tolerance, capstone bar ("all / nearly all" badges).
- **Best subject definition conflict.** The PRD scope says "quiz/exam accuracy by subject", while PRD §D and V2 say *most time*. The prototype follows V2 (time).
- **Live-class "held" on Limited.** V2 lists *attended + held* as must-show, but the V2 Limited mock shows only the count. "৬ of ৪০" risks reading as shaming. Prototype shows held (must-show wins) pending a call.
- **Fresh Start close CTA.** The V2 Fresh Start deck says `শেখা শুরু করো`, but the Screen 11 Fresh mock shows `শেখা চালিয়ে যাও`. Prototype uses `শেখা শুরু করো`.
- **No-name banner.** V2 has no generic headline; the prototype drops the name ("শিখোতে তোমার বছরটা কেমন গেল?").
- **Night-owl type.** Hour-band data is unverified; it's flagged on screen.
- **Auto-advance.** V2 doesn't specify it. Default is tap-paced; a 6 s toggle is in the dev panel. Slides with actions never auto-skip.
- **Teacher slide (04).** P0 only if the data is launch-ready; there's a dev toggle.

- **Class without group.** V2 says to drop the class · group line "if either is empty", but Classes 6–8 have no group. The prototype keeps শ্রেণি and omits বিভাগ instead of hiding the class.

## Missing assets (placeholders are dashed boxes marked "ASSET")
- **Shikho 3D mascot, cover pose** (transparent PNG/WebP, square, ≥ 780 px, Screen 01 band, bottom-right anchored)
- 3D mascot / illustration library (the only real asset in the repo is the bird mark from `shikho-portal-redesign-v2`)
- Generic male/female teacher avatars; sample cleared teacher photo
- Badge artwork ×4 + capstone
- Subject colours beyond Physics/Math (others are placeholders, marked `verified: false`)
