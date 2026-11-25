# Motion Design System V1 — foundation

The Wrap should feel choreographed by one motion designer while every screen keeps its own visual concept. This folder is the shared foundation for that. It is wired in only where it reproduces today's behaviour exactly: the hand-over table. Screens adopt the rest during the screen-by-screen refinement.

Source of truth for current timings: `review/wrap-2026-motion-audit.md` (25 Nov 2026).

| File | What it holds |
|---|---|
| `tokens.ts` | `DURATION`, `EASE`, `STAGGER`, the preserved `SPECIAL_EASE` curves, and `OFFER_RULE` |
| `ease.ts` | Easing adapters: `motionEase`, `gsapEase`, `cssEase`, `easeFn` |
| `categories.ts` | M1–M4 categories and budgets, plus the reference screens |
| `ambient.ts` | Allowed ambient loops and their reduced-motion rule |
| `handovers.ts` | Screen-to-screen hand-over table: used by `StoryViewer` and `background.ts` |
| `screens.ts` | Phase markers per screen: measured, code and target |
| `timeline.ts` | `TimelineHandle` plus the GSAP, Motion, CSS and group adapters, a capped-step rAF clock, and shared playback speed |
| `useScreenTimeline.ts` | The shared screen lifecycle hook (not adopted yet) |

## Tokens

```ts
DURATION = { press: 0.12, exit: 0.20, quick: 0.30, base: 0.45, settle: 0.60, slow: 0.90, count: 1.00 }
EASE     = { settle: [0.22,1,0.36,1], arrive: [0.16,1,0.3,1], exit: [0.4,0,0.2,1],
             glide: [0.55,0,0.25,1], drop: [0.55,0,0.9,0.45], linear: "linear" }
STAGGER  = { line: 0.06, row: 0.08, tile: 0.12 }
```

Use one token through the right adapter for each consumer:

| Consumer | Call | Result |
|---|---|---|
| Motion | `motionEase("settle")` | `[0.22, 1, 0.36, 1]` |
| GSAP | `gsapEase("settle")` | `"wm-settle"` |
| CSS | `cssEase("settle")` | `"cubic-bezier(0.22, 1, 0.36, 1)"` |
| rAF clocks | `easeFn("settle")` | `(t) => eased t` |

GSAP CustomEases are registered on first use under a `wm-` prefix. The screens already use `wrap-*` names, and `wrap-settle` is a different curve from `EASE.settle`, so reusing that name would change 04.

The curves that are essential to an existing animation stay as they are. They are named in `SPECIAL_EASE`: cover expand, dawn, quiz curves, lane drift and others.

## Categories and budgets (targets, not current behaviour)

| Category | Screens | Hero readable | Settle | Character |
|---|---|---|---|---|
| **M1** Standard storytelling | 02, 03, 05, 06, 07, 08 | 1.6–2.4 s (Quiz ≈ 2.6 s) | ≤ 2.8 s | Continuous, without needless holds |
| **M2** Emotional reveal | 04, 09 | 2.2–2.6 s | ≈ 3.0 s | One deliberate anticipation beat |
| **M3** Information assembly | 10 | — | ≈ 1.6 s | Deliberate staggered assembly; Bento stays readable |
| **M4** Cinematic storytelling | Covers and closings (original and Bird Journey) | each its own | each its own | The original Cover and The Year Turns are references. The Bird Cover keeps its length. The Bird Closing's future target is its message at ≈ 3.0–3.2 s. |

**Reference screens.** These are not modified while the other screens are refined:
- 08 Most active day: pacing and continuous movement.
- 03 Live classes: shared-element hand-over.
- 11 The Year Turns: closing and course reveal.

## Common choreography

Phases overlap where they should.

1. **Hand-over:** the incoming screen takes over from the outgoing one.
2. **Concept:** the screen's main visual idea moves.
3. **Hero:** the personalised result becomes readable. This is always the most important visual event.
4. **Support:** supporting copy and details.
5. **Rest:** the settled reading state. Ambient loops may continue.

Unrelated graphics are not forced to morph into each other for consistency's sake. A hand-over may simply clear and arrive.

## Hand-overs (`handovers.ts`)

`HANDOVERS` lists each bespoke step (`study→live` is `flow`, …) and any extra condition it needs. `KIND_TIMING` gives each kind three values:
- `out`: how long the outgoing screen stays mounted.
- `bg`: the background transition length.
- `navigation`: today a lock with `lockMs`.

The numbers are the existing constants from `story/entry.ts`, referenced rather than copied.

`resolveKind()` contains the rule `StoryViewer` used to inline. `bgDuration()` replaces the branch chain in `background.ts`. The per-screen phase markers (hero, copy, settle) live in `screens.ts`, keyed by the incoming screen.

The future navigation mode `tapToComplete` (a tap finishes the entrance; the next tap advances) is reserved in the type but **not active**. Backward navigation is unchanged.

## Phase markers (`screens.ts`)

`{ category, handoverEnd, heroAt, copyAt, settleAt, ambientLoops }` per screen, from three sources that are never mixed:

| Source | What it is |
|---|---|
| `measured` | The audit probe's fixed numbers |
| `code` | Derived from the constants the screen runs today (imported where exported) |
| `target` | The V1 budget, or `"keep"` for reference screens |

Closings separate `settleAt` (the emotional ending) from `offerSettleAt` (including the course recommendation).

## Course recommendation

Both closings share one panel: banner, "প্রোগ্রামে ভর্তি হও", and a share icon, with the same eligibility logic and destinations. **Future rule** (`OFFER_RULE`, not active): the panel starts 1.2 s after the closing copy settles and enters over 0.75 s.

| Closing | Starts today | Starts under the rule |
|---|---|---|
| The Year Turns | 3.45 s | ≈ 3.55 s |
| Bird closing | 6.45 s | follows its future copy timing |

## Timelines (`timeline.ts`, `useScreenTimeline.ts`)

`TimelineHandle` offers `play`, `pause`, `seek`, `finish`, `stop`, `setSpeed`, `time` and `duration`. Adapters wrap what screens already build, so no rewrite is needed:

| Adapter | Wraps |
|---|---|
| `fromGsap(tl)` | A GSAP timeline or tween (03, 04, 05, 11, Bird) |
| `fromMotion(controls)` | Motion sequences (01, 02, 06, 07, 10) |
| `createClock({ duration, render })` | The capped-step rAF clock that 08 and 09 hand-write: a long frame slows the animation and never skips |
| `fromCss(el)` | CSS animations and transitions (05's state colours) |
| `group(...)` | Several handles combined (GSAP stage plus Motion text) |

`registerTimeline(handle)` plus `setPlaybackSpeed(s)` give one review speed across all libraries. Only timelines that registered are affected, and GSAP's global timeline is left alone.

`useScreenTimeline({ build, final, leave })` owns the lifecycle the screens repeat today:
- the still frame under reduced motion or repeat view;
- build before paint;
- leave, which stops, returns borrowed elements and runs the exit, then removes the screen when its time is up;
- the final frame when revived during rapid taps;
- stop and unregister on unmount.

No screen uses it yet. Adoption happens one screen at a time, each verified against its markers.

## Ambient motion (`ambient.ts`)

These loops are allowed, and none counts toward a screen's settle time:
- the cover digit float;
- the subtle cover arrow nudge;
- the background twinkle;
- the live clock;
- the bird's idle movement;
- the bird's flight, airflow and clouds.

Under reduced motion every nonessential loop stops (`ambientAllowed()`). The live clock is essential: it keeps showing the time, stepping once a second without a tween.

## Not changed in this phase

- **Screen choreography and timings:** every screen's animation and timing is unchanged.
- **`lib/motion.ts`:** comment only; it is marked as superseded for new work.
- **Curves:** the local curves in the screens are unchanged.
- **GSAP ticker:** `gsap.ticker.lagSmoothing(0)` is still set in three hand-over modules. It is global, and changing it affects every GSAP animation, so consolidating it needs its own before/after check.
