# Reference Motion Language

A study of the reference prototype's animation language (primarily **C3 Journey**), compared with our Motion Design System, with a proposal for a development-only **Reference Motion** profile. Analysis only: no screen has been changed. For review before any implementation.

| | |
|---|---|
| Reference | `../wrap-reference`, commit `d6b2e9d95c8c42ee345009e14eafeb4a4f9d2c00` (read-only) |
| Primary source | `flows/year-end-wrap/directions/C3-journey/index.html` |
| Also read | A3 Poster, B3 Marksheet (for comparison only; not mixed into the profile) |
| Ours | `src/motion/*`, `src/lib/motion.ts`, `src/story/entry.ts`, `src/story/StoryViewer.tsx`, `src/components/CountUp.tsx`, every screen in `src/screens/` |
| Date | 26 Nov 2026 |

Line numbers refer to C3's `index.html` at that commit. Reference timings are in seconds from the slide's mount (its clock `t`), which is also when our screens start.

---

## 0. Summary

**What makes the reference feel the way it does is not its easing curves.**
- **Same curves:** its standard deceleration (`--out`, `cubic-bezier(.16,1,.3,1)`) is *identical* to our `EASE.arrive`, and our `EASE.settle` (`.22,1,.36,1`) is within 0.01 of it everywhere.
- **The five real differences:**
  1. **Overshoot everywhere.** Text, cards, badges and panels arrive past their place and settle back. A 10 % overshoot curve is used for text (`--pop`); real damped springs, with 9–35 % overshoot, for objects. We have almost none: every curve in our tokens stops at 1.0.
  2. **Numbers are caused by the picture.** The count is a function of the infographic (cards landed, seats lit, film run, windows lit), on the same clock and usually the same in-out curve. Ours count on their own timer with a fast-then-crawl curve, mostly beside the visual rather than driven by it.
  3. **Every hero number lands.** When the count completes, the number swells (1 → 1.16 → 0.97 → 1), flashes gold, glows, and throws a few star sparks. Ours simply stop.
  4. **Entrances use scale as well as travel, and take longer.** Text rises 22 px from 96 % scale over 0.9 s. Objects grow from 0.85 or 0.3. Ours rise 8–16 px (or out of a mask) over 0.4–0.55 s, without scale.
  5. **Everything is one continuous clock.** Each slide is a single pure function of time: `seek(t)` writes every element's transform and opacity, so nothing waits on callbacks. Cues are expressed as relations ("land = last card + 0.3 s", "panel 0.7 s after landing").
- **The proposal:**
  - a **Reference Motion profile** that adds the reference's overshoot, springs, coupled counts, number landing and text rise to our existing tokens and timeline adapters;
  - applied through a small set of profile-aware primitives;
  - selected by a dev-only global switch (Original / Reference) that is independent of journeys and screen facets;
  - with screens that are already ports (Quiz Activities, the Study Time sun and moon), bespoke hand-overs, characters and backgrounds protected from it.

---

## 1. Reference motion inventory

### 1.1 Engine

- **Clock** (`loop`, 1962):
  - one `requestAnimationFrame` loop advances `clk` (frame step capped at 64 ms) and calls the current slide's `TL.seek(clk)`, then `FX.paint(clk)`;
  - `?t=` freezes any moment, and reduced motion seeks to `1e3` (the end state).
- **Painters:** each slide's `mount()` returns `{ seek(t) }`, a pure function of `t`. It uses `put(el, transform, opacity)` (660), which writes only on change and sets `will-change` once, so the compositor animates transforms and opacity only.
- **CSS keyframes:** used only for slide transitions, simple text entrances (`.up`, `.fade`) and ambient loops. The player pauses and resumes them with the clock.
- **Maths** (636–684):
  - `eio` = cubic in-out; `eo` = cubic out;
  - `spr(t, ζ, ωn)` = closed-form under-damped spring (unit step, zero initial velocity);
  - `kf(keys, t, ease)` = piecewise keyframes, `eio` between keys by default;
  - `rng` = mulberry32 (seeded scatter);
  - `lerp`, `clamp`.
- **Effects canvas** (`FX`, 977–1034): one canvas for confetti and star sparks; every particle is a function of `t`; DPR is capped at 1.5.

### 1.2 Curves

| Name | Value | Peak | Character | Used for |
|---|---|---|---|---|
| `--out` | `cubic-bezier(.16,1,.3,1)` | 1.000 | expo-like out, 83 % done at 25 % time | slide in (640 ms) |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | 1.000 | soft out | fades (700 ms) |
| `--pop` | `cubic-bezier(.34,1.56,.64,1)` | **1.098** at 57 % | rises past by ~10 %, settles back | text `.up` (900 ms), bird pop, moon |
| exit | `cubic-bezier(.4,0,.2,1)` | 1.000 | standard in-out | slide out (420 ms) |
| `eio` | cubic in-out | 1.000 | symmetric acceleration and deceleration | counts, travel, zooms, lens |
| `eo` | cubic out | 1.000 | decelerating | outlines, glows, short counts |

A3 and B3 use `--spring: cubic-bezier(.34,1.3,.64,1)` (peak 1.03), or a CSS `linear()` spring (peak 1.054) where supported, for their `.rise` entrances. That is gentler than C3's `--pop`.

### 1.3 Springs (closed form `spr(t, ζ, ωn)`)

The Motion equivalent is mass 1, stiffness = ωn², damping = 2ζωn.

| Use (C3) | ζ | ωn | Overshoot | Peak at | ~2 % settle | Motion stiffness / damping |
|---|---|---|---|---|---|---|
| Card position (quiz) | 0.60 | 11 | 9.5 % | 0.36 s | 0.61 s | 121 / 13.2 |
| Card tilt (quiz) | 0.45 | 11 | 20.5 % | 0.32 s | 0.81 s | 121 / 9.9 |
| Cover text lines | 0.50 | 13 | 16.3 % | 0.28 s | 0.62 s | 169 / 13.0 |
| Badge panel rise | 0.60 | 12 | 9.5 % | 0.33 s | 0.56 s | 144 / 14.4 |
| Medal scale (stamp) | 0.42 | 15 | 23.4 % | 0.23 s | 0.63 s | 225 / 12.6 |
| Medal rotation | 0.50 | 13 | 16.3 % | 0.28 s | 0.62 s | 169 / 13.0 |
| Earned title (masked rise) | 0.55 | 13 | 12.6 % | 0.29 s | 0.56 s | 169 / 14.3 |
| Fan, bottom → top card | 0.80 / 0.60 / 0.32 | 9 | 1.5 / 9.5 / 34.6 % | 0.58 / 0.44 / 0.37 s | 0.56 / 0.74 / 1.39 s | 81 / 14.4, 10.8, 5.8 |
| Share carousel (with release velocity) | 0.55 | 15 | 12.6 % | 0.25 s | 0.48 s | 225 / 16.5 |
| Grapheme squash (type name) | `e^(−5.5b)·cos(22b)` | — | 30 % squash | — | ~0.8 s | (hand-written damped cosine) |

**Rule of the reference:**
- Position springs are critically softer than rotation springs: rotation gets lower ζ, so tilt wobbles a little longer than travel.
- Stamps and medals use high ωn with low ζ (fast, snappy overshoot).
- Stacks finish with progressively looser springs (the top card wobbles most).

### 1.4 Number count-up and digit transitions

| Screen (C3) | Count driver | Curve | Window | Landing (`landFx`) | Sparks |
|---|---|---|---|---|---|
| days ১৮৭ | the number pulls out of the grid (scale 0.28 → 1) while counting | `eo` | 2.1 → 2.8 s | at 2.85 s | 7 sparks, distance ≥ 50 px |
| streak ২৩ | after the August flare | `eo` | 3.45 → 4.6 s | at 4.7 s | — |
| hours ১৪২ | windows light as the count passes each 6 h (count drives the picture) | `eio` | 0.45 → 3.3 s | at 3.3 s | 7 sparks (seed 31) |
| live ৬৩ | the count *is* the number of seats lit as the lens passes (no separate curve) | lens `eio` 2.2 s | 0.8 → ~3.1 s | lastLit + 0.12 s | 7 sparks |
| quiz ১৪৮ | the count is the sum of landed cards (each contributes over 0.16 s) | card springs | 0.55 → 2.61 s | at last card + 0.3 s | 7 sparks |
| video ২,৮৬০ | film strips and number on one curve, so they stop together | `eio` | 0.45 → 3.05 s | T0 + TD + 0.05 s | 8 sparks |

- **Display:**
  - `fixW` locks the number's width to the final value, so the unit never jitters; we do the same with CountUp's ghost.
  - `setNum` writes only when the rounded value changes, and toggles a `cnt` class while counting.
- **Landing, `landFx(h, a)`** (968), with `a` = seconds since landing:
  - **number scale:** keys 1 → 1.16 (0.23 s) → 0.97 (0.47 s) → 1 (0.76 s), `eio` between keys, transform-origin 0 75 % (it swells from its baseline-left);
  - **gold overlay** (a gold copy of the digits on top): opacity 0 → 1 (0.2 s), hold until 0.66 s, → 0 (1.2 s). The number therefore *flashes* gold and returns to white;
  - **glow disc** (240 px radial gold gradient behind the number): scale 0.3 → 1.8 (`eo`), opacity 0 → 1 (0.22 s) → 0 (1.0 s);
  - **sparks:** 7–8 four-point stars (2/3 gold, 1/3 white). Each flies out along its own angle (`eo` over 0.44 s, then drifts 15 % further), scales 0.2 → 1.1 → 0.3, spins 2.8 rad and fades over the last 45 % of 0.8 s.
- **No digit-roll or per-digit animation** anywhere in C3. Digits change in place, and the whole number moves as one.
- **Elsewhere:**
  - A3: `counter(el, to, t0, dur, fmt, ease = eo)` (time-based), then `land` and `flash`.
  - B3 hours: the count follows an ink level rising through the outlined number (`eio`, 1.35 s), with an edge line that rides the level.

### 1.5 Heading and supporting text

| Primitive | Implementation | Parameters |
|---|---|---|
| **Kicker / line rise** `.up` | CSS keyframe | from opacity 0, `translateY(22px) scale(.96)` to none; **900 ms `--pop`** (≈10 % overshoot); delay `--d` in ms. Kicker `--d:0`, the line under the number `--d:100`. |
| **Soft fade** `.fade` | CSS keyframe | opacity 0 → 1, 700 ms `--ease`; used for captions (`--d:3700` on hours) |
| **Cover text lines** | painter | per line `u = t − i·0.12`: y = 22·(1 − spr(u, 0.5, 13)), opacity = clamp(4u) (in 0.25 s); stagger **0.12 s** |
| **Earned title** | painter, masked | y = h·1.15·(1 − spr(a − 0.4, 0.55, 13)): rises out of its own mask with a spring |
| **Headings swap** (hours, day → night) | two copies cross-faded | ink copy fades out 1.0 → 1.7 s; white copy fades in over the same window |
| **Name by grapheme** (type) | painter per grapheme | stagger 0.06 s; drop from −40 px stretched (sx 0.7, sy 1.7) to the baseline in 0.16 s (ease-in); then damped squash sy = 1 − 0.3·d, sx = 1 + 0.22·d with d = e^(−5.5b)·cos(22b); opacity in 0.08 s; `Intl.Segmenter` and hasanta-aware splitting |
| A3 / B3 `.rise` | CSS | translateY 22–28 px → 0, 900 ms `--spring`; A3 uses an accelerating delay ladder: 120, 240, 380, 560, 760, 1000, 1400, 1800, 2000, 2350, 2500, 2700 ms |

### 1.6 Content reveal and disappearance

- **Reveals:**
  - **Opacity is short; motion is long.** Opacity typically reaches 1 in 0.08–0.25 s (`clamp(u/.08)`, `clamp(4u)`), while position, scale and rotation take 0.6–1.4 s on springs. Things are *visible almost at once and then settle*.
  - **Scale-up from small:** cards 0.85 → 1 with their position spring; seats 0.3 → 1.25 → 1 (`kf`); the emblem 0.3 → 1.1 → 1 with −20° → 4° → 0°; panels from +26 px.
  - **Lens and light passes:** a lens moves on `eio` and each item lights as the lens centre passes (live), or a light travels up a road (cover).
  - **Slats and doors:** slats scale X to 0 with `eio(u·1.7 − i·0.1)`; a door swings `rotateY` 0 → −80 → −88° (`eo`), then fades.
- **Disappearance inside a slide** is mostly opacity on a short clamp:
  - hint: 0.2 s;
  - chips: travel into the door on `eio` 0.42 s while scaling to 0.25 and fading;
  - ink heading: `hd-out` 700 ms;
  - a pulse fades at both ends of its life: `min(g·6, (1 − g)·6)`.
- **Nothing exits on its own at the end of a slide.** The whole slide leaves (§1.12).

### 1.7 Translation, scale, rotation, opacity: typical magnitudes

| Property | Typical C3 values |
|---|---|
| Text travel | 22 px up (A3: 28) |
| Text scale | 0.96 → 1 |
| Object travel | from off-stage (cards start at ±(stage/2 + card width), seeded height); panels 26 px; bird 70 px |
| Object scale | 0.85 → 1 (cards), 0.3 → 1.25 → 1 (seats), 0.3 → 1.1 → 1 (emblem), 1.9 → 1 (medal stamp) |
| Rotation | cards start ±(26–56)°, land within ±6°, fan to −16 / −6 / +7°; medal −28° → 0; grapheme none |
| Opacity in | 0.08–0.25 s |
| Hero number | 1 → 1.16 → 0.97 → 1 |

### 1.8 Stagger

| Where | Interval |
|---|---|
| Quiz cards | **0.16 s** (12 cards over 1.76 s) |
| Fan (top three) | 0.06 s |
| Cover text lines | 0.12 s |
| Live seats | 0.026 s per seat, rows timed by the lens (`eioInv`) |
| Live rows fade in | 0.05 s, back to front |
| Graphemes | 0.06 s |
| Slats | 0.1 (on a stretched clock: `u·1.7 − i·0.1`) |
| Chips into the door | 0.05 s |
| Share cards opening | 0.07 s |
| Days squares | by date order across 0.95 s, plus 0.1 s seeded jitter |

**Principle:** stagger follows meaning (date order, distance from the lens, stack order), not just DOM order.

### 1.9 Infographic assembly

- **Seeded scatter → target** (days, quiz, end dots):
  - a start position from `rng(seed)`;
  - travel `eo` (days, 0.72 s, a curved path bent by `sin(π e)·bend`) or springs (quiz);
  - each item's start offset follows the data;
  - a trail line while in flight (days).
- **Count-coupled reveal:** windows, seats and cards light as the count passes them (§1.4).
- **Camera:** zoom into one region and out again (days: `eio` in 0.6 s, hold, out 0.7 s), with the rest dimmed to 28 %.
- **Hand-over inside a screen:** the number pulls *out of* the grid (scale 0.28 → 1 from the grid's centre, `eio` 0.75 s).

### 1.10 Sequencing, pauses and anticipation

- **Cues are relative.** Landing = last item + 0.3 s (quiz) / + 0.12 s (live) / + 0.05 s (video); badge panel = landing + ~0.7 s (3.35 / 3.45 / 3.6 s); sparks fire *at* landing; fan = landing + 0.25 s.
- **One hold at the climax.** The number lands, then ~0.7 s of quiet before the badge. On days: zoom in, hold 0.7 s, zoom out.
- **Anticipation:**
  - cover banner presses in 3.5 % before growing (`1 − .035·sin(π·e/.2)`);
  - the door holds 0.08 s before swinging;
  - the bird squashes before hops (`bird-hop` 18 %: scale 1.1, 0.86), and the grapheme drop is stretched before it squashes.
- **Overlap:** phases overlap rather than wait. The count runs during the assembly, the moon starts while the sun is still setting, and the fan starts during the landing.

### 1.11 Ambient

- **Glows** (`glw`): radial blobs drifting by (dx, dy), scale 1 → 1.18, 8 s alternate.
- **Sparkles** (`spk`): opacity 0.2 → 1, rise 10 px, scale 0.45 → 1, rotate 45°, 3.2 s.
- **Stars:** three twinkle layers (`twk` 3 s, offset 1 s).
- **Characters and props:** bird float 9 px over 3.6 s; halo pulse ×1.12 over 3 s; flag wave.
- **Background-level:** these are part of each slide's stage (background) layer in C3.

### 1.12 Screen-to-screen transition

- **Push in** (`yj-in`, 640 ms `--out`): from `translate3d(34%,0,0) scale(.94)` with opacity 0, which reaches 1 at 40 % (256 ms).
- **Push out** (`yj-out`, 420 ms `cubic-bezier(.4,0,.2,1)`): to `translate3d(−14%,0,0) scale(.94)`, opacity 0. The old slide is removed at 460 ms. Back navigation mirrors both.
- **Clock start:** the new slide's clock starts at its mount, so its choreography begins *during* the push.
- **Reduced motion:** no push.

### 1.13 Final settle

- Every painter has a `done` time (quiz 5.4 s, live 5.2, days 5.6, video 5.4); after it, `seek` stops writing.
- The final frame is the pure function's limit: springs to within ~1 px, the gold overlay back to 0, and white numbers. There is no separate "settled" state to jump to.
- Ambient loops continue.

---

## 2. Our motion language compared

| Category | Ours today | Reference | What creates the perceived difference | Adopt globally? | Screen-specific | Keep unchanged |
|---|---|---|---|---|---|---|
| **Easing** | `EASE.settle` (.22,1,.36,1), `arrive` (.16,1,.3,1), `exit`, `glide`, `drop`; every curve stops at 1.0 | `--out` = our `arrive`; plus `--pop` (peak 1.098) and real springs | Not the decelerating curves (they match). The absence of **overshoot** makes ours feel placed rather than arriving. | Add `pop` and the spring presets as tokens | Which elements get overshoot | `settle`, `arrive`, `exit`, `glide`, `drop` |
| **Number count** | `CountUp`: Motion `animate(0 → N)` on `[.16,1,.3,1]` over 0.5–1.4 s (Live 0.5, Quiz 1.1, Study 1.4, Video 0.6), started by a timer; Timekeeper drives its own from the hand | Count is a function of the infographic, usually `eio` (sometimes `eo`, or a sum of landings), 0.7–2.9 s | Ours front-load (83 % done at 25 % time), then crawl, separate from the visual. The reference accelerates *with* the picture and stops *with* it. | The coupling rule and the `eio` / `eo` choice | What drives each count (a clock hand, a playhead, rails) | Timekeeper's count (character-driven, already coupled) |
| **Number landing** | None: the number stops; the text then appears | `landFx` (swell 1.16, gold flash, glow, sparks) | The single largest difference. The reference gives every result a *moment*. | Yes, as a primitive, once per hero number | Flash colour: our hero numbers are already yellow (see §6) | — |
| **Heading / support text** | Masked line rise (`y 105% → 0` in `overflow:hidden`) or opacity + `y 8–16 px`, 0.4–0.55 s on `settle`; stagger 0.06–0.07 | `.up`: 22 px + scale 0.96, 900 ms `--pop`; cover lines on `spr(.5,13)` with 0.12 s stagger; opacity complete in 0.25 s | Longer travel, scale, overshoot, faster opacity: text *lands* rather than fades in | Yes: `textIn` with roles (kicker, line, caption) | Masked headings (overshoot would clip, see §6) | Teacher name (`nameSoft`, held), Learner reveal blur |
| **Content exit** | Bespoke hand-overs: text fades 0.18–0.2 s, then shared elements travel (FLOW, FOCUS, ANSWER, WATCH, TAKEOVER, DAYLINE, ASSEMBLE, ONWARD); otherwise T1 | Whole slide pushes out (420 ms, −14 %, scale 0.94); inside a slide, short opacity clamps | Ours is more sophisticated (shared elements). The reference's simplicity is not better here. | Only for the plain T1 step (`normal` kind) | — | All bespoke hand-overs |
| **Element entrance** | Beziers (no overshoot), y and opacity; scale rarely (Marksheet 0.86 / 0.94 → 1) | Springs (§1.3); scale from 0.85 / 0.3; opacity first, motion settles after | Springs give mass and weight | Spring presets via a primitive | Which objects: cards, tiles, chips, stamps | Characters, the clock |
| **Stagger** | `STAGGER.line 0.06`, `row 0.08`, `tile 0.12` | 0.12 (lines), 0.16 (cards), 0.06 (fan, graphemes), data-ordered | Similar magnitudes. The reference orders by meaning and lets springs overlap. | Add `card 0.16`, `fan 0.06` | Ordering by data | Existing hand-over cadences |
| **Assembly** | Per-screen, bespoke (rails, seats, tiles) | Seeded scatter → target, count-coupled, zoom-and-hold | — | No (design-level) | Possibly the Marksheet tiles and Quiz rails, with springs | Layouts and infographic designs |
| **Anticipation / pause** | M2 screens hold before the hero (Teacher); Live "present" moment | Landing → ~0.7 s quiet → support; small press-ins and squashes | The landing beat creates a natural pause before the copy | The landing-then-support relation | — | M2 holds |
| **Ambient** | Allowlist: background twinkle, cover digit float, live clock, bird idle and flight | Glows, sparkles, stars, bird float, halo pulse (stage layer) | Lives in the background in C3 | **No** (backgrounds are preserved) | — | All of ours |
| **Screen transition** | T1: x ± 28 px + opacity, 280 ms (`MOTION.nav`); `fade` for sky pairs; bespoke kinds | Push: 34 % + scale 0.94, 640 ms in / 420 ms out | Longer, deeper push | Candidate for `normal` only (opt-in, see §5.4) | — | `fade` and every bespoke kind |
| **Final settle** | Each screen's last tween; reduced motion / repeat view = final state | Pure-function limit; `done` time | Equivalent outcome | — | — | Reduced motion and repeat-view rules |
| **Architecture** | GSAP masters, Motion sequences, rAF clocks; adapters in `motion/timeline.ts`; Motion Inspector virtual clock | One rAF clock + painters + CSS keyframes (WAAPI paused) | Not perceptible; matters for porting | Port maths to our adapters (no WAAPI) | — | Inspector, adapters |

### Summary of the comparison

- **Adopt globally:** overshoot text rise, spring presets, coupled `eio` counts, the number landing, and the landing-then-support relation.
- **Adapt per screen:** what drives each count, which objects spring, and the flash colour on yellow numbers.
- **Keep:** curves without overshoot for exits and shared-element moves, all bespoke hand-overs, M2 holds, ambient, characters and backgrounds.

---

## 3. Proposed motion primitives (extracted parameters)

Everything below extends `src/motion/`. Under the **Original** profile, each primitive returns today's parameters, so a screen that moves onto a primitive is unchanged unless the Reference profile is selected.

### 3.1 New tokens (`motion/tokens.ts`)

```ts
EASE.pop      = [0.34, 1.56, 0.64, 1]   // C3 --pop, peak 1.098 (exists as SPECIAL_EASE.refPop / celestialRise)
EASE.inOut    = cubic in-out (eio)       // C3 counts, travel, zooms
STAGGER.card  = 0.16                     // C3 quiz
STAGGER.fan   = 0.06                     // C3 fan, graphemes
SPRING = {                               // closed form spr(t, ζ, ωn); Motion: stiffness ωn², damping 2ζωn
  travel: { z: 0.6,  wn: 11 },           // cards, tiles, panels moving into place
  tilt:   { z: 0.45, wn: 11 },           // rotation riding on a travel
  text:   { z: 0.5,  wn: 13 },           // headline lines (cover style)
  panel:  { z: 0.6,  wn: 12 },           // a support panel rising
  title:  { z: 0.55, wn: 13 },           // a masked title rising
  stamp:  { z: 0.42, wn: 15 },           // a badge / medal stamping in
  settle: [ {z:0.8,wn:9}, {z:0.6,wn:9}, {z:0.32,wn:9} ],  // a stack fanning, bottom → top
}
```

Plus a `motion/spring.ts` with the following, so GSAP, Motion and rAF clocks all use the same spring:
- `spr(t, z, wn)`;
- `springEase(z, wn)`: an ease function over its 2 % settle time;
- `settleTime(z, wn)`;
- `toMotionSpring(z, wn)`.

### 3.2 Primitives

| Primitive | Reference behaviour (exact) | Original profile returns |
|---|---|---|
| `textIn(role)`<br>roles: `kicker`, `line`, `caption` | kicker / line: opacity 0 → 1 (on the curve, effectively in ~0.25 s), y 22 → 0, scale 0.96 → 1, **0.9 s `pop`**; line +0.1 s after its kicker. caption: opacity only, 0.7 s `--ease`. Multi-line headline: per line `spr(text)`, y 22 → 0, opacity in 0.25 s, stagger 0.12 s. | the screen's current step (e.g. masked rise 0.45 s `settle`) |
| `countTo({ driver })` | the count is `N · f(progress)`: `progress` comes from the infographic's own timeline (playhead, hand, landings), or, without a visual driver, from `eio` over the screen's count window (`eo` for short counts under 1.2 s) | `CountUp` as today |
| `landNumber(el)` | at count end: scale 1 → 1.16 → 0.97 → 1 over 0.76 s (keys at 0.23 / 0.47 / 0.76, `eio` between), origin 0 75 %; flash overlay 0 → 1 (0.2) → hold (0.66) → 0 (1.2 s); glow disc scale 0.3 → 1.8 (`eo`), opacity 0 → 1 (0.22) → 0 (1.0 s); sparks: 7 four-point stars, 2/3 gold 1/3 white, radius max(50 px, 0.5 × number width), 0.8 s life | nothing |
| `springIn(el, preset)` | opacity in over 0.08 s; position, scale (0.85 → 1) and rotation on `SPRING[preset]` (rotation on `tilt`) | the screen's current tween |
| `staggerGroup(items, interval, order)` | per item start = base + i × interval, where `order` can be data order (date, distance, stack) | current stagger |
| `assemble(items, { from: "scatter", seed })` | seeded start (mulberry32), travel `eo` 0.72 s along a bent path (`sin(πe)·bend`, bend 0.08–0.2), or `springIn` | — (design-level; used only where a screen opts in) |
| `heroSettle()` | the relation: support copy starts **after** landing + 0.7 s (quiz 3.35 vs 2.61; live 3.45; video 3.6) | current support timing |
| `screenPush` | in 0.64 s `--out` from x 34 % + scale 0.94, opacity reaching 1 at 40 %; out 0.42 s `(.4,0,.2,1)` to x −14 % + scale 0.94 | T1 as today |

### 3.3 Not a generic fade-and-slide

- **Roles get different motion:** a kicker rises with overshoot, a caption only fades, a number counts with its picture and lands, and objects spring with their own presets.
- **Each screen keeps its own choreography.** The profile supplies the *personality* (overshoot, springs, landing, coupling), not the *sequence*.

---

## 4. Screen-by-screen adaptation plan (Reference profile only)

| Screen | Proposed under Reference Motion | Unchanged |
|---|---|---|
| 01 Cover (M4, internal motion reference) | Nothing | Everything (it is the motion reference for M4) |
| 02 Study time, original clock | Count driven by the clock's spin progress on `eio` instead of its own 1.4 s timer (the count and the hands stop together); `landNumber` when the hands land; `textIn` for the lead (kicker) and comparison (caption) | Clock, spin, sky hand-over; the day/night sky (ported) |
| 02 Study time, Timekeeper | `landNumber` when the hand comes to rest (the count is already coupled); `textIn` for the copy | Bird, physics, gaze, hand, sky |
| 03 Live classes (M1 reference screen) | `landNumber` at the end of the 0.5 s count; `textIn` for heading and line | FLOW seat hand-over, the "present" moment, timings up to the count |
| 04 Teacher (M2) | Nothing by default; optionally `textIn(caption)` for the framing line | Light, figure, held breath, the name's `nameSoft` arrival (appreciation, not celebration) |
| 05 Quiz, Answer Parade | Count coupled to the deck's fan-out progress (`eio`); `landNumber`; `textIn` for the headline; nudge / badge after landing + 0.7 s (`heroSettle`) | ANSWER and WATCH hand-overs, rails |
| 05 Quiz, Quiz Activities | **Exempt** (already the reference's own motion) | Everything |
| 06 Video | Count coupled to the watchline / playhead progress on one `eio` (C3 video: number and film stop together); `landNumber` | WATCH hand-over, players, cards |
| 07 Subject | `textIn` for the supporting copy; `springIn(stamp)` for the subject's badge if it is a discrete element | TAKEOVER, blur takeover |
| 08 Most active day (M1 pacing reference) | `landNumber` on the hours figure, if present, only | DAYLINE, its rAF choreography |
| 09 Learner type (M2) | Option, needs your decision: the reference's grapheme drop-and-squash for the type name (stagger 0.06, stretch 0.7 / 1.7, `e^(−5.5b)cos(22b)`), *instead of* the blur reveal | The rest of the reveal |
| 10 Marksheet (M3) | Tiles on `springIn(travel)` with `STAGGER.tile` (0.12) and scale 0.94 → 1 (they keep their order); `textIn` for the heading | ASSEMBLE hand-over, bento layout |
| 11 Closing (M4) | `textIn` for the offer copy only | Year Turns choreography, OFFER rule |
| Bird cover and closing | Nothing | Character choreography |
| Story transition (`normal`) | Optional `screenPush` (§5.4) | `fade`, every bespoke kind |

The rollout would be one screen at a time, each reviewed in the Motion Inspector (Original vs Reference). Video and Study time are the clearest first candidates: both have a visual driver for their count.

---

## 5. Global motion profile selector: architecture

### 5.1 Model

```
src/motion/profile.ts     type MotionProfile = "original" | "reference"
                          MotionProfileCtx + useMotionProfile()
                          resolve: URL ?mprofile=reference  >  dev panel  >  "original"
src/motion/reference.ts   the extracted constants (§1, §3) — one source
src/motion/spring.ts      spr, springEase, settleTime, toMotionSpring
src/motion/primitives.ts  textIn, countTo, landNumber, springIn, staggerGroup,
                          assemble, heroSettle, screenPush  — each reads the profile
```

### 5.2 Rules

- **Independent axis.** The selector is not a journey mode or a facet. It combines freely with Original / Bird Journey / Bird-led and every facet (`study.character`, `study.sky`, `quiz.design`). It lives in `DevSettings.motionProfile` and the `?mprofile=` URL, beside `facets`.
- **No duplicate components.** Unlike `motion/versions.ts` (`REFINED`, which registers whole alternative components), the profile changes parameters inside primitives. A screen is migrated onto primitives once; under Original they return exactly today's values.
- **Verification of "Original unchanged".** After each screen migration, the Motion Audit probe must match the stored baseline (as done for facets: largest difference within run-to-run noise, about 70 ms).
- **Our timeline architecture only.** Primitives emit GSAP tweens or Motion sequence steps through `motion/timeline.ts` adapters, or plain rAF clock functions. No WAAPI: the inspector frame removes `Element.prototype.animate`.
- **Motion Inspector.**
  - The frame accepts `mprofile`.
  - The inspector gets an Original / Reference control, reusing the existing Original / Refined comparison UI.
  - Phase markers per profile go in `screens.ts` (`profiles.reference.code`), with timing exceptions recorded there.
- **Exemptions** (§6) are declared in one list (`PROFILE_EXEMPT`) and enforced by the primitives: an exempt element or screen always gets the original behaviour.
- **Reduced motion and repeat view:** unchanged (final state). `landNumber` and sparks are skipped.

### 5.3 Dev panel

- **"Motion profile":** Original / Reference, with the URL winning, as for facets.
- **Hint:** which screens currently use primitives, so it is clear where the switch has an effect.

### 5.4 Screen transition

`screenPush` would apply only to the `normal` kind (non-bespoke, non-sky). Our persistent background does not move: only the foreground pushes, which differs from C3, where the slide carries its own background. It is optional and separate from the rest of the profile.

---

## 6. Potential conflicts

1. **Already-ported reference motion would animate twice:**
   - Quiz Activities (`quiz.design = reference`);
   - the Study Time sun and moon (`study.sky = daynight`).

   They must be exempt: they already *are* reference motion, at reference timing.
2. **Bespoke hand-overs own their elements** (GSAP masters in `heroHandoff`, `focusHandoff`, `quizHandoff`, `watchHandoff`, and the TAKEOVER / DAYLINE / ASSEMBLE / ONWARD timelines). Primitives must never target those elements, or two engines fight over one transform. Ownership is already documented per timeline, and primitives will check it.
3. **Characters:** Timekeeper bird, Bird Journey cover and closing. Not touched. The number landing on Study Time sits beside the bird, never on it.
4. **Masked headings:** several headings rise out of `overflow:hidden` line masks. `pop` overshoot (+10 %) and the 22 px rise would clip at the mask's top edge. Either `textIn` keeps the mask and uses the spring only after the line has cleared it, or the mask is dropped for that heading. This needs a per-screen check; it does not change layout.
5. **Yellow hero numbers:** C3's landing flashes a *white* number to gold. Ours are already gold or yellow, so a gold overlay would be invisible. Options:
   - (a) flash to a lighter gold (#FFE9A3) and back;
   - (b) keep only the swell, glow and sparks.

   Recommendation: (b), with no colour change. Your call.
6. **Durations versus category budgets.** Text at 0.9 s, the landing at 0.76–1.2 s and support at landing + 0.7 s push "settled" later. Estimated M1 settle under Reference: about 3.2–3.8 s, against 2.8 s. These would be recorded as profile exceptions in `screens.ts`, not forced into the budget, following the Quiz Activities precedent.
7. **Navigation locks** (`lockMs` per hand-over) are tuned to today's hero timing. With later landings, taps could advance before the landing. The locks would be reviewed per screen under Reference (Original untouched).
8. **Sparks versus the "no particles" rule.** `lib/motion.ts` still says "Never: floating particles, confetti". Landing sparks are one-shot (0.8 s), not ambient, but this needs your explicit approval. They would render on a canvas, as in Quiz Activities.
9. **Count coupling changes when the number is readable.** Coupled `eio` counts finish when their driver finishes (e.g. Video's playhead), not at a fixed time. For each screen, the hero time moves to the driver's end. That is the point of the change, but it moves `heroAt`.
10. **Overshoot near edges.** Springs with 20–35 % overshoot (tilt, fan top card) can momentarily cross nearby text or the safe area. These presets are only for objects with room around them.
11. **Repeat view and reduced motion:** unaffected by design. Primitives return the final state.

---

## 7. Decisions needed before implementation

1. Approve the primitive set and parameters (§3).
2. Number flash on yellow numbers: (a) lighter-gold flash, or (b) swell, glow and sparks only (recommended).
3. Approve one-shot landing sparks (§6.8).
4. Learner type name: the reference's grapheme spring instead of the blur reveal, or keep the blur.
5. `screenPush` for plain transitions: yes or no.
6. Rollout order. Proposed: primitives and selector with no screen migrated (verify Original unchanged), then Video, then Study time, then the rest one by one.

---

## 8. Implementation status (26 Nov 2026)

### Decisions applied

| # | Decision | How it was applied |
|---|---|---|
| 1 | Building blocks approved | `motion/spring.ts`, `motion/reference.ts`, `motion/primitives.ts` |
| 2 | Landing approved, no gold flash | Swell and glow kept, flash dropped; glow peak 0.5 (subtle) |
| 3 | Sparks optional, toggleable | `?msparks=1`, dev panel toggle, Inspector checkbox; off by default |
| 4 | Learner type grapheme reveal | Approved; not yet implemented (after the pilots) |
| 5 | Screen push | Deferred |
| 6 | Rollout order | Infrastructure (commit `73da4b1`), then pilots 06 Video and 02 Study time; stopped there for review |

### Infrastructure

- **Profile:** `motion/profile.tsx` holds the profile (`?mprofile=`, `?msparks=`, dev panel).
- **Inspector:** the Motion Inspector has a "Profile" control and passes `mprofile` / `msparks` to its preview.
- **Original unchanged:** the timing probe showed the largest difference from the baseline at 77 ms (run-to-run noise).

### Pilot 06 Video

- **Driver:** the minutes are driven by the cards folding into the year's four playback tiles. The count comes from the sequence's own clock, through the tiles' own start times, durations and curves (`watchCountModel`), so it accelerates and stops with them.
- **Landing:** last tile + 0.05 s.
- **Support:** the comparison at landing + 0.4 s (caption fade, 0.7 s); the badge at landing + 0.5 s (panel spring, ζ 0.6, ωn 12).
- **Heading:** the reference's text rise, through its mask (overshoot 5.6 px, inside the 9 px mask padding).

### Pilot 02 Study time (original clock)

- **Driver:** the count is the clock's spin, read from the minute hand's own rotation (`AnalogClock onSpin`).
- **Landing:** when the hands land (spin end + 0.05 s).
- **Text:** the lead rises as a kicker; the unit as a line (+0.1 s); the comparison is a caption at landing + 0.4 s (C3 hours).
- **Protected:** the Timekeeper and the day/night sun and moon are unchanged.

### Deviations from the reference

1. **Wide hero rows** (Video's number and "মিনিট" across nearly the full width): the swell is scaled down so the row stays 8 px inside the screen, keeping the same curve and timing. That gives about 1.12 at 390 px and 1.105 at 360 px; a five-digit total leaves room only for about 1.02. Study keeps the full 1.16.
2. **Glow:** subtle (peak 0.5 instead of 1), with no colour flash. Approved.
3. **Video's driver is the tile fold, not the playback line.** The line finishes filling in state 02, before the minutes are on screen; the tiles are the visible progression while the number counts.
4. **Rapid back → forward on Video:** under Reference, a screen called back while leaving restarts its entrance. Original keeps its existing behaviour: the entrance stays frozen with the tiles hidden, a pre-existing issue that has not been changed.
