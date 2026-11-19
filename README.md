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
- [~] **Screen 03 — Live classes: "The Front-Row Seat"** (Nov 2026 brief, revision 2). Files: `src/screens/LiveClass.tsx`, `src/styles/live-class.css`. It sits over the shared sky.
  - **Copy:** "এই বছর তুমি / লাইভ ক্লাসে ছিলে" · [attended] · "টি ক্লাসে".
  - **Layout (asymmetric):** the headline and number are left-set on the gutter in the upper part. The yellow number has its unit on the same baseline.
  - **The hall:** one full-bleed SVG anchored to the bottom edge. Seven tiered rows of chair silhouettes, seen from the front of the room: backrest, posts, seat and legs.
    - The front row is the largest and brightest (Primary 500). Rows behind it shrink toward one centre axis and thin out into the sky.
    - The student's chair, in the front row just right of centre, is Warning 500.
    - On short frames the hall is capped at 54cqh and crops from the top, so the front row never clips.
  - **02 → 03 "clock drops, seat rises"** (timeline `FLOW` in `src/story/entry.ts`; both slides mounted together; taps locked 1.1 s):
    - **A** 0–180 ms: Screen 02's text fades and the clock holds.
    - **B** 180–550 ms: the clock drops straight down out of frame (ease-in, no rotation or fade).
    - **C** 400–750 ms: the yellow chair rises from below (ease-out, no bounce).
    - **D** from 650 ms: whole rows fade up, front row first, then backwards (50 ms apart).
    - **E** 850 ms to about 1.3 s: the headline mask, then the count (450 ms) and the unit.
  - Entered any other way, the same sequence starts at once without the clock. Reduced motion shows the settled frame.
  - **Motion pass (Nov 19):**
    - The hero hand-over (clock, yellow chair, rows) is now one GSAP master timeline (`src/screens/heroHandoff.ts`, CustomEase curves). Motion keeps the text, count-up and story UI, and no element property is shared between the two.
    - The rows now "stand up" (scaleY 0.9 → 1 from the floor) and start while the chair is still settling, which removes the 300 ms pause.
    - The chair arrives slightly large (1.06 → 1) for depth.
    - Timings: clock 150–570 ms (accelerating), chair 360–860 ms (decelerating), rows from 500 ms at 50 ms steps, text from 780 ms.
    - The per-frame log shows steady 17 ms frames on desktop Chrome.
    - Recordings and 50 ms frame strips: `review/m11/`.
  - **Not shown (V2 must-show):** classes held, and the ফার্স্ট বেঞ্চার badge. The V2 screen remains at `?live=v2`.
  - **Recordings and screenshots:** `review/m10/`. The previous seat-grid version's captures are in `review/m9/`.
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
