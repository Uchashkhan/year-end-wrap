/**
 * The Gateway — the closing's ২০২৭ checkpoint: the entrance to a new year of
 * learning. Flat vector geometry only (no glow, no perspective):
 *   three concentric arch bands  Shikho yellow rim · violet · blue
 *   capitals at the spring line   a dark violet band across each pillar
 *   keystone                      a blue block through the rim's crown
 *   plinth                        one dark violet base
 *   the opening                   a faint lighter fill (the way through)
 *   ২০২৭                          Baloo Da 2 ExtraBold, Shikho yellow, inside the opening
 * viewBox 300 × 290; the arch is centred on (150, 150).
 */
export const GATE = { w: 300, h: 290 } as const;

const CX = 150;
const CY = 150;
const FOOT = 272;
/** A thick arch band between radii R (outside) and r (inside), standing on FOOT. */
const band = (R: number, r: number) =>
  `M${CX - R} ${FOOT} V${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY} V${FOOT} H${CX + r} V${CY} A${r} ${r} 0 0 0 ${CX - r} ${CY} V${FOOT} Z`;
const opening = (r: number) => `M${CX - r} ${FOOT} V${CY} A${r} ${r} 0 0 1 ${CX + r} ${CY} V${FOOT} Z`;

export function Gateway({ year }: { year: string }) {
  return (
    <svg className="bjw-gate-art" viewBox={`0 0 ${GATE.w} ${GATE.h}`} aria-hidden="true">
      <path d={opening(84)} fill="#8fa2ff" fillOpacity="0.14" />
      <path d={band(132, 118)} fill="#f3be28" />
      <path d={band(118, 96)} fill="#6a43cf" />
      <path d={band(96, 84)} fill="#4c6cf5" />
      {/* capitals */}
      <rect x="10" y="146" width="64" height="13" rx="6.5" fill="#2e2183" />
      <rect x="226" y="146" width="64" height="13" rx="6.5" fill="#2e2183" />
      {/* keystone */}
      <rect x="133" y="9" width="34" height="38" rx="9" fill="#4c6cf5" />
      <rect x="143" y="19" width="14" height="18" rx="4" fill="#f3be28" />
      {/* plinth */}
      <rect x="4" y="270" width="292" height="18" rx="9" fill="#2e2183" />
      <text className="bjw-gate-year" x={CX} y="222" textAnchor="middle">
        {year}
      </text>
    </svg>
  );
}
