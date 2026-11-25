# Motion Inspector (development only)

Open **`http://127.0.0.1:5180/?view=motion`** while the dev server runs. It is not in production builds: the route, the inspector, the frame boot and the virtual clock are all left out (checked on a production build).

## How it works

- **The preview is the real prototype.** It runs in an iframe (`/?motionFrame=1&…`) that shows only the phone, starting where the inspector asks. It never reads or writes the developer's saved dev-panel settings.
- **One clock drives the frame.** `frameBoot.ts` is injected by the dev server ahead of the app's entry (`vite.config.ts`, `apply: "serve"`). It installs a virtual clock (`clock.ts`) before GSAP, Motion or React load, and takes over the time sources each library uses:
  - `performance.now`, `Date` and `requestAnimationFrame`;
  - timers;
  - CSS animations and transitions.

  Motion runs on its JS driver (no WAAPI). So every screen follows one time source with no migration: GSAP timelines, Motion sequences, rAF clocks, CSS transitions, delayed callbacks and count-ups.
- **Steps are capped.** Time advances in steps of at most 1/60 s at every speed, so capped-step clocks (08, 09) behave as they do in real time. The wall clock is fixed (25 Nov 2026, 10:10), so 02's clock is identical in every replay.
- **Replay and backward seeks reload the frame** and fast-forward from its first frame, which makes them deterministic. Count-ups, shared elements, CSS state, SVG, timers and the course recommendation are all reset.
- **Forward seeks** fast-forward in place.
- **Live markers** come from `observe.ts`, which uses the Motion Audit's probe method. Ambient loops (long-running, still moving) are excluded from settle.
- **Data** comes from `src/motion/`:
  - metadata (`screens.ts`: code / measured / target);
  - category budgets;
  - ambient list;
  - timeline adapters (`registerTimeline`, `devRegister`, which is a no-op in production).

## Modes

| Mode | What it inspects |
|---|---|
| **A · Screen** | The screen's stand-alone entrance (the story opened directly on it). |
| **B · Transition** | The previous screen is fast-forwarded to settled, then the story's own key press runs the production hand-over (shared elements included). For 01, the home banner's start control is used. |
| **C · Journey** | The whole deck, Original or Bird Journey, from the home banner. Manual ‹ › or QA auto-advance (settle + 1.5 s, separate from the product's 6 s timer). Live markers restart at every screen change. |

## Controls

Play, Pause and Resume; Replay; drag the playhead to seek, or use ← → on the focused timeline; jump to Hero / Copy / Settled (code-derived times); previous and next screen; speed 0.25×, 0.5×, 1× and 2×.

Scenarios: student profile, viewport (360×800, 390×844, 430×932), reduced motion, eligible next program on or off.

The **Motion** switch shows Original. Refined is shown as not available until a refined screen is registered in `src/motion/versions.ts` (`REFINED`). That registry is the comparison architecture: same props, data, viewport and transport. The preview frame takes `?motion=refined`.

## Support matrix

| Screen | Library | Transport (virtual clock) | Registered adapter |
|---|---|---|---|
| 01 Cover | Motion | ✓ | — |
| 02 Study | Motion | ✓ | — |
| 03 Live | GSAP + Motion | ✓ | ✓ group (`fromGsap` + `fromMotion`) |
| 04 Teacher | GSAP + Motion | ✓ | — |
| 05 Quiz | GSAP + Motion + CSS | ✓ | — |
| 06 Video | Motion | ✓ | ✓ `fromMotion` |
| 07 Subject | Motion + GSAP | ✓ | — |
| 08 Peak day | rAF clock | ✓ | ✓ `observeOnly` (reads its clock; can't drive it until it migrates to `createClock`) |
| 09 Learner | rAF clock | ✓ | — |
| 10 Marksheet | Motion | ✓ | — |
| 11 Year Turns | GSAP | ✓ | ✓ `fromGsap` |
| Bird cover / closing | GSAP + flight ticker | ✓ | — |
| Dev variants | various | ✓ (live values only, no metadata) | — |

What the columns mean:
- **Transport** is everything playback needs: play, pause, speed, seek and deterministic replay.
- **Registered adapters** report a screen's own timeline (source, time, duration) in the inspector's "Registered timelines" panel. They prove the Phase 02 adapters on real screens. Further screens register as they adopt `useScreenTimeline` during refinement.

## Known limits

- **Timings are idealised.** Live times come from a stall-free clock, so they run about 0.03–0.15 s earlier than the audit, whose real-time measurements included dropped frames at the tap.
- **Mode A:** code and measured values describe the forward hand-over (Mode B), so in Mode A compare against the live column.
- **Backward seeks** reload the frame (≈ 1–2 s on the dev server).
- **08's adapter** is observe-only. Its loop isn't migrated, which is deliberate: 08 is a reference screen.
- **Mode C auto-advance** decides from live observation, polled every 80 ms of real time, so its rests vary slightly.
