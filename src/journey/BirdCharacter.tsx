import { useId } from "react";
import { FLYING, REAR, RESTING, type LayerId, type Pose } from "./birdParts";

/**
 * BirdCharacter — the Shikho bird as one rig with two poses (Figma exports,
 * birdParts.ts). Both poses sit in one box in FLYING units (200.173 × 167) and
 * are registered on the head: the resting pose is scaled so its head is the
 * flying head's size (73 / 51) and placed so the two heads coincide. A turn is
 * then a short, aligned cross-fade — one character changing orientation, never
 * two drawings swapping size or place.
 */
export const HEAD_SCALE = 73 / 51; // flying head width / resting head width
/** The resting pose inside the rig (flying units). */
export const REST_BOX = (() => {
  const w = RESTING.w * HEAD_SCALE;
  const h = RESTING.h * HEAD_SCALE;
  // head centres: flying (107.5, 44); resting (48.5, 27) → scaled
  return { x: 107.5 - 48.5 * HEAD_SCALE, y: 44 - 27 * HEAD_SCALE, w, h };
})();

/**
 * Joints (pose units) each moving layer turns about: the wings at the
 * shoulder, the tail where it meets the body, the body at its centre.
 */
export const PIVOT: Record<PoseName, Partial<Record<LayerId | "neck", [number, number]>>> = {
  // wingL turns about the upper part of its joint with the torso (the joint runs x ≈ 79–85,
  // y ≈ 66–122): the root stays on the body through the stroke instead of swinging off it
  flying: { wingL: [80, 70], wingR: [137, 95], tail: [87, 124], body: [107, 82] },
  resting: { wingL: [33, 50], wingR: [67, 50], tail: [30, 82], neck: [48, 47] },
  // rear wingL: about the bottom of its joint with the back (the joint runs (57, 72) → (47, 104)),
  // so raising it tucks the upper root over the body instead of opening the lower one
  rear: { wingL: [48, 103], wingR: [110, 66], tail: [56, 118], neck: [90, 70] },
};

export type PoseName = "flying" | "resting" | "rear";
/**
 * Head registration, shared by all three poses: each pose's head centre and
 * width (its head's bounding box). Placing every pose so its head centre sits
 * on one anchor at one head width keeps the character the same size and in the
 * same place through any turn.
 */
export const HEAD: Record<PoseName, { cx: number; cy: number; w: number }> = {
  flying: { cx: 107.5, cy: 44, w: 73 },
  resting: { cx: 48.5, cy: 27, w: 51 },
  rear: { cx: 91, cy: 45, w: 72 },
};
/** A pose's box around a head anchor at (0, 0), for a head `headW` px wide. */
export function poseBox(name: PoseName, headW: number) {
  const pose = name === "flying" ? FLYING : name === "rear" ? REAR : RESTING;
  const k = headW / HEAD[name].w;
  return { left: -HEAD[name].cx * k, top: -HEAD[name].cy * k, width: pose.w * k, height: pose.h * k };
}

/**
 * Sub-groups inside a layer (contiguous runs, so paint order is unchanged):
 * the resting pose's eyes — white, pupil, highlight and lash — so they can
 * blink about their own centres (EYES).
 */
const SUB: Partial<Record<PoseName, Partial<Record<LayerId, { cls: string; from: number; to: number }[]>>>> = {
  resting: { head: [{ cls: "eyeL", from: 2, to: 5 }, { cls: "eyeR", from: 14, to: 18 }] },
  rear: { head: [{ cls: "eyeR", from: 4, to: 7 }] },
};
/**
 * Hidden overlaps (no new artwork): a pose's own path, stroked in its own fill
 * colour so it reaches a few units past its edge, clipped to one joint and
 * painted behind everything in its layer. The flying pose's wing meets the
 * torso edge-to-edge (0.5 units apart) along x ≈ 79–85, y ≈ 66–122; this
 * extends the torso under the wing root there, so neither the antialiased edge
 * nor a flap (≤ 24° about PIVOT.flying.wingL) can show the background.
 * The band starts at y 67: above it the sky borders the torso by design.
 */
const UNDERLAY: Partial<Record<PoseName, { layer: LayerId; path: number; width: number; clip: [number, number, number, number] }[]>> = {
  flying: [{ layer: "body", path: 0, width: 9, clip: [60, 72, 30, 52] }],
  // rear: the far wing meets the back edge-to-edge along (57, 72) → (47, 104)
  rear: [{ layer: "body", path: 0, width: 9, clip: [38, 72, 30, 34] }],
};

/** Eye centres (resting-pose units): the eye whites' bounding-box centres. */
export const EYES = { eyeL: [39.5, 31.5], eyeR: [62.5, 28.5] } as const;
/** The excitement ticks' base (resting-pose units): where they spring from. */
export const MARKS_AT = [68, 16] as const;

export function BirdPose({ pose, name, className = "" }: { pose: Pose; name: PoseName; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const path = (p: Pose["layers"][number][1][number], i: number) => <path key={i} d={p.d} fill={p.fill} fillOpacity={p.o} />;
  const under = (id: LayerId) =>
    (UNDERLAY[name] ?? [])
      .filter((u) => u.layer === id)
      .map((u, k) => {
        const src = pose.layers.find(([l]) => l === id)![1][u.path];
        const cid = `${uid}-u${k}`;
        return (
          <g key={`u${k}`} className="bl-underlay">
            <clipPath id={cid}>
              <rect x={u.clip[0]} y={u.clip[1]} width={u.clip[2]} height={u.clip[3]} />
            </clipPath>
            <path d={src.d} fill={src.fill} stroke={src.fill} strokeWidth={u.width} strokeLinejoin="round" clipPath={`url(#${cid})`} />
          </g>
        );
      });
  return (
    <svg className={`bird bird-${name} ${className}`} viewBox={`0 0 ${pose.w} ${pose.h}`} overflow="visible" aria-hidden="true">
      {pose.layers.map(([id, parts]) => {
        const subs = SUB[name]?.[id];
        if (!subs) {
          return (
            <g key={id} className={`bl bl-${id}`} data-layer={id}>
              {under(id)}
              {parts.map(path)}
            </g>
          );
        }
        // wrap each sub-group's contiguous run; everything else stays in place
        const out: React.ReactNode[] = [];
        for (let i = 0; i < parts.length; i++) {
          const sg = subs.find((g) => g.from === i);
          if (sg) {
            out.push(
              <g key={`g${i}`} className={`bl-${sg.cls}`}>
                {parts.slice(sg.from, sg.to + 1).map((p, k) => path(p, k))}
              </g>,
            );
            i = sg.to;
          } else out.push(path(parts[i], i));
        }
        return (
          <g key={id} className={`bl bl-${id}`} data-layer={id}>
            {under(id)}
            {out}
          </g>
        );
      })}
    </svg>
  );
}

/** The rig: both poses, head-registered, in one 200.173 × 167 box. */
export function BirdRig({ className = "" }: { className?: string }) {
  return (
    <div className={`bj-rig ${className}`} aria-hidden="true">
      <div className="bj-rig-tilt">
        <BirdPose pose={FLYING} name="flying" className="bj-fly" />
        <div className="bj-rest" style={{ left: REST_BOX.x, top: REST_BOX.y, width: REST_BOX.w, height: REST_BOX.h }}>
          <BirdPose pose={RESTING} name="resting" />
        </div>
      </div>
    </div>
  );
}

export { FLYING, RESTING, REAR };
