import { useLayoutEffect, useRef } from "react";
import { BirdPose, FLYING, PIVOT, REAR, RESTING } from "./BirdCharacter";

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
      {cell(RESTING.w, RESTING.h, <BirdPose pose={RESTING} name="resting" className="lab-svg" />)}
      {cell(RESTING.w, RESTING.h, <img src="/assets/journey/_ref-resting.svg" style={{ width: "100%", height: "100%", display: "block" }} alt="" />)}
      {cell(REAR.w, REAR.h, <BirdPose pose={REAR} name="rear" className="lab-svg" />)}
      {cell(REAR.w, REAR.h, <img src="/assets/journey/_ref-rear.svg" style={{ width: "100%", height: "100%", display: "block" }} alt="" />)}
      <style>{".lab-svg{width:100%;height:100%;display:block}"}</style>
      <SeamCheck />
      <RearSeamCheck />
    </div>
  );
}

/** Rear pose (closing idle): wings at rest, mid-flap and at the eager flap's peak (+15.5° / −17°). */
function RearSeamCheck() {
  return (
    <div style={{ display: "flex", gap: 16, flex: "none" }}>
      {[0, 8, 15.5].map((a) => (
        <RearRotated key={a} a={a} />
      ))}
    </div>
  );
}
function RearRotated({ a }: { a: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const L = ref.current?.querySelector(".bl-wingL");
    const R = ref.current?.querySelector(".bl-wingR");
    L?.setAttribute("transform", `rotate(${a} ${PIVOT.rear.wingL![0]} ${PIVOT.rear.wingL![1]})`);
    R?.setAttribute("transform", `rotate(${-a * 1.1} ${PIVOT.rear.wingR![0]} ${PIVOT.rear.wingR![1]})`);
  }, [a]);
  return (
    <div ref={ref} className="seam-rear" style={{ width: REAR.w * 4, height: REAR.h * 4, background: "#6051cc", flex: "none" }}>
      <BirdPose pose={REAR} name="rear" className="lab-svg" />
    </div>
  );
}

/** Seam check: the flying pose (Figma 983:1722) at 4×, its wings at rest and through the Figma stroke (0°, 24°, 48°) about its pivots. */
function SeamCheck() {
  const angles = [0, -24, -48];
  return (
    <div style={{ display: "flex", gap: 16, flex: "none" }}>
      {angles.map((a) => (
        <Rotated key={a} a={a} />
      ))}
    </div>
  );
}
function Rotated({ a }: { a: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const L = ref.current?.querySelector(".bl-wingL");
    const R = ref.current?.querySelector(".bl-wingR");
    L?.setAttribute("transform", `rotate(${a} ${PIVOT.flying.wingL![0]} ${PIVOT.flying.wingL![1]})`);
    R?.setAttribute("transform", `rotate(${-a} ${PIVOT.flying.wingR![0]} ${PIVOT.flying.wingR![1]})`);
  }, [a]);
  return (
    <div ref={ref} className="seam-cell" style={{ width: FLYING.w * 4, height: FLYING.h * 4, background: "#cce5fc", flex: "none" }}>
      <BirdPose pose={FLYING} name="flying" className="lab-svg" />
    </div>
  );
}
