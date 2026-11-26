import { useId, type SVGProps } from "react";

export const OPTICS_SPECTRUM = ["#ff8c91", "#ffc07a", "#ffe4a1", "#a4edb3", "#87dfff", "#c0abff"];

export function OpticsPrism(props: SVGProps<SVGGElement>) {
  const id = useId();
  return (
    <g {...props}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#baf2ff" /><stop offset="1" stopColor="#539ddd" />
        </linearGradient>
      </defs>
      <path d="M-33 32-6-36 37 24 18 39Z" fill="#274f9e" stroke="#b3deff" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-33 32-6-36 18 39Z" fill={`url(#${id})`} stroke="#e3f9ff" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-6-36 37 24 18 39Z" fill="#5084c7" stroke="#b3deff" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-21 24-9-5M-12 30-1 5" stroke="#f3fbff" strokeOpacity=".48" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

export function OpticsProjection(props: SVGProps<SVGGElement>) {
  return (
    <g {...props}>
      <path d="M-12-27 19-37 18 33-13 44Z" fill="#234688" stroke="#d0ebff" strokeWidth="1.4" strokeLinejoin="round" />
      {OPTICS_SPECTRUM.map((ink, i) => (
        <path key={ink} d={`M-11 ${-19 + i * 10} 17 ${-29 + i * 10}`} stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
      ))}
      <path d="M19-37 23-33 22 34 18 33Z" fill="#82aad7" />
    </g>
  );
}
