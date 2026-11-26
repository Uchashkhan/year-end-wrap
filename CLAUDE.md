# Shikho Wrap 2026 — project rules

## Repositories

| Role | Path | Remote |
|---|---|---|
| **Primary project** (all work happens here) | this repository | https://github.com/Uchashkhan/year-end-wrap.git (`main` = version 1, `version-2` = current) |
| Version 1 worktree (frozen, for comparison) | sibling folder `../year-end-wrap (claude) v1` (git worktree of `main`) | same repo, `main` |
| **External reference** (read-only) | sibling folder `../wrap-reference` (its own clone) | https://github.com/tasmeetiqbal-tech/shikho-year-end-wrap-prototype.git |

### The reference repository is read-only

- **Read-only:** never modify, delete, commit to, push to, or reset the reference clone (`../wrap-reference`), and don't run its scripts or install anything there without approval. Reading its files and `git log`/`git rev-parse` are fine.
- **No merging:** don't merge the repositories or add the reference as a submodule, subtree or remote of the primary project.
- **Change only the primary project:** all implementation changes happen in the primary project only.
- **Selective reuse:** elements (backgrounds, animations, infographic behaviours, transitions, effects, assets, code) are taken selectively and only where the user asks for them. Each is re-implemented in our stack (React, GSAP or Motion, the `src/motion/` tokens and timelines) and placed behind our variant architecture. Our existing design stays the foundation.
- **Copy:** don't import its copy. Screen text stays PRD copy (its titles and helper lines are unreviewed).
- **Mascot:** don't import its bird PNGs (placeholder crops). The approved bird SVGs stay the source.
- **Permission:** it has no licence file. Confirm reuse with its owner before copying code or assets verbatim.
- **Inventory:** `docs/wrap-reference-inventory.md`, analysed at reference commit `d6b2e9d95c8c42ee345009e14eafeb4a4f9d2c00`. Update the inventory and the hash whenever the reference changes.

## Working rules (from the project's history)

- **Copy:** screen text comes from the PRD only.
- **Backgrounds:** each screen keeps its designated background (`SCREEN_BACKGROUND`, `src/story/background.ts`).
- **Dev switches:** don't add dev comparison switches unless asked; new versions replace the screen in their mode and the old component stays in the code.
- **Commits:** commit and push only when the user asks. Version 2 work goes on the `version-2` branch.
- **Dev server:** don't restart it (port 5180; the v1 worktree runs on 5181).
- **Motion:** use the Motion Design System in `src/motion/` (tokens, categories, hand-overs, timelines) and check changes in the Motion Inspector (`?view=motion`).
