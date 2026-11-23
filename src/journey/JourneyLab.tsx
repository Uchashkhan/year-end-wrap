import { BirdPose, FLYING, REAR, RESTING } from "./BirdCharacter";

/**
 * Dev view `?view=bird`: Pass 1 check — each pose as rebuilt from its split
 * layers next to the untouched Figma export, at 3×.
 */
export function JourneyLab() {
  const z = 3;
  const cell = (w: number, h: number, child: React.ReactNode) => (
    <div className="lab-cell" style={{ width: w * z, height: h * z, background: "#cce5fc", position: "relative", flex: "none" }}>
      {child}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 24, padding: 24, background: "#fff", alignItems: "flex-start" }}>
      {cell(FLYING.w, FLYING.h, <BirdPose pose={FLYING} name="flying" className="lab-svg" />)}
      {cell(FLYING.w, FLYING.h, <img src="/assets/journey/_ref-flying.svg" style={{ width: "100%", height: "100%", display: "block" }} alt="" />)}
      {cell(RESTING.w, RESTING.h, <BirdPose pose={RESTING} name="resting" className="lab-svg" />)}
      {cell(RESTING.w, RESTING.h, <img src="/assets/journey/_ref-resting.svg" style={{ width: "100%", height: "100%", display: "block" }} alt="" />)}
      {cell(REAR.w, REAR.h, <BirdPose pose={REAR} name="rear" className="lab-svg" />)}
      {cell(REAR.w, REAR.h, <img src="/assets/journey/_ref-rear.svg" style={{ width: "100%", height: "100%", display: "block" }} alt="" />)}
      <style>{".lab-svg{width:100%;height:100%;display:block}"}</style>
    </div>
  );
}
