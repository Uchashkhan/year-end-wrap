import type { CSSProperties } from "react";
import { bn } from "../lib/bangla";

/**
 * The hero number's size on the sky screens (02, 03). Steps down with digit
 * count, so 4-digit totals still fit one line at 360 px.
 */
export function statSize(n: number): CSSProperties {
  const len = bn(n).length;
  const size = len <= 2 ? "min(40cqw, 22cqh)" : len === 3 ? "min(34cqw, 19cqh)" : "min(27cqw, 15cqh)";
  return { "--sc-size": size } as CSSProperties;
}
