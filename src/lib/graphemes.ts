/**
 * Split text into user-perceived characters so an animation never breaks a
 * Bangla conjunct or a vowel sign: Intl.Segmenter grapheme clusters, and a
 * cluster that ends in a hasanta (্), ZWJ or ZWNJ joins the next one (the
 * reference prototype's rule, C3 `graphemes`). Spaces stay their own piece.
 */
export function graphemes(s: string): string[] {
  let out: string[];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("bn", { granularity: "grapheme" });
    out = [...seg.segment(s)].map((x) => x.segment);
  } else out = Array.from(s);
  const m: string[] = [];
  for (const g of out) {
    const p = m[m.length - 1];
    if (p && /[্‍‌]$/.test(p)) m[m.length - 1] = p + g;
    else m.push(g);
  }
  return m;
}
