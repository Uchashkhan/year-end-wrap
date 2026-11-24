/**
 * The ২০২৭ sky checkpoint (the sky-flight closing's destination) — a milestone
 * marker that lives in the sky, flat vector, Shikho colours:
 *   cloud bank      flat white cloud forms it rests on (two tones, no blur)
 *   two flag poles  rising from the clouds, a pennant on each (magenta, yellow)
 *   bunting         one string between the pole tops, small flags in Shikho blue,
 *                   magenta and yellow — the "checkpoint" line
 *   plaque          a deep violet rounded plaque with a yellow inner frame;
 *                   ২০২৭ (Baloo Da 2 ExtraBold, yellow) is the hero
 * viewBox 320 × 282.
 */
export const CHECKPOINT = { w: 320, h: 282 } as const;

const FLAGS = ["#5468ff", "#e2008d", "#f3be28", "#5468ff", "#e2008d", "#f3be28", "#5468ff"];

export function SkyCheckpoint({ year }: { year: string }) {
  // the bunting: a gentle sag from pole top to pole top; flags hang from points along it
  const L = { x: 28, y: 38 };
  const R = { x: 292, y: 38 };
  const sag = 20;
  const at = (t: number) => ({ x: L.x + (R.x - L.x) * t, y: L.y + (R.y - L.y) * t + sag * 4 * t * (1 - t) });
  const flags = FLAGS.map((c, i) => {
    const t = (i + 1) / (FLAGS.length + 1);
    const a = at(t - 0.04);
    const b = at(t + 0.04);
    const m = at(t);
    return <path key={i} d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)} L${m.x.toFixed(1)} ${(m.y + 17).toFixed(1)} Z`} fill={c} />;
  });
  return (
    <svg className="bjs-check-art" viewBox={`0 0 ${CHECKPOINT.w} ${CHECKPOINT.h}`} aria-hidden="true">
      {/* poles and pennants */}
      <rect x="25" y="30" width="6" height="214" rx="3" fill="#2e2183" />
      <rect x="289" y="30" width="6" height="214" rx="3" fill="#2e2183" />
      <circle cx="28" cy="29" r="6" fill="#f3be28" />
      <circle cx="292" cy="29" r="6" fill="#f3be28" />
      <path d="M31 44 L66 54 L31 64 Z" fill="#e2008d" />
      <path d="M289 44 L254 54 L289 64 Z" fill="#f3be28" />
      {/* the bunting */}
      <path d={`M${L.x} ${L.y} Q160 ${L.y + sag * 2} ${R.x} ${R.y}`} fill="none" stroke="#2e2183" strokeWidth="2.5" strokeLinecap="round" />
      {flags}
      {/* the plaque */}
      <rect x="52" y="86" width="216" height="118" rx="30" fill="#3b2fa8" />
      <rect x="64" y="98" width="192" height="94" rx="20" fill="none" stroke="#f3be28" strokeWidth="4" />
      <text className="bjs-check-year" x="160" y="171" textAnchor="middle">
        {year}
      </text>
      {/* the cloud bank it rests on (front of the poles' feet and the plaque's lower edge) */}
      <g>
        <ellipse cx="160" cy="260" rx="150" ry="20" fill="#e6f2ff" />
        <circle cx="62" cy="240" r="24" fill="#ffffff" />
        <circle cx="106" cy="230" r="30" fill="#ffffff" />
        <circle cx="160" cy="236" r="26" fill="#ffffff" />
        <circle cx="212" cy="226" r="32" fill="#ffffff" />
        <circle cx="260" cy="242" r="24" fill="#ffffff" />
        <rect x="36" y="240" width="248" height="28" rx="14" fill="#ffffff" />
      </g>
    </svg>
  );
}
