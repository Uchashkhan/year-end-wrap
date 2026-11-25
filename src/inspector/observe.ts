/**
 * Motion Inspector — live observation inside the preview frame (development only).
 * The same method as the Motion Audit's probe: after every virtual step, each
 * element of the incoming screen is sampled (effective opacity, box, clip,
 * count-up text); a phase marker is the moment its elements stopped changing.
 * Elements still changing near the end of the observation are ambient loops and
 * are left out of the settle time.
 */

export interface ObserveOptions {
  /** The hero element (the personalised result) in the incoming screen. */
  heroSel: string | null;
  /** Closings: the course recommendation starts here (s from origin); the emotional ending is measured before it. */
  offerAt: number | null;
}

export interface Observation {
  /** Seconds observed since the origin. */
  observedTo: number;
  handoverEnd: number | null;
  firstVisible: number | null;
  heroAt: number | null;
  copyAt: number | null;
  settleAt: number | null;
  /** Closings with an offer: everything settled, including the course recommendation. */
  offerSettleAt: number | null;
  ambient: string[];
  /** True once nothing finite has moved for 1.2 s. */
  stable: boolean;
}

interface El {
  sig: string;
  /** First and last change (s). */
  first: number;
  last: number;
  lastPre: number;
  changes: number;
  text: boolean;
  op: number;
  inOffer: boolean;
  cls: string;
}

const AMBIENT_WINDOW = 1.2;

export function createObserver(opts: ObserveOptions) {
  const els = new Map<Element, El>();
  const hero: [number, number, string][] = [];
  let sawTwo = false;
  let handoverEnd: number | null = null;
  let firstVisible: number | null = null;
  let tNow = 0;
  const cutoff = opts.offerAt ?? Infinity;

  const isText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());

  function sample(t: number) {
    tNow = t;
    const slides = [...document.querySelectorAll(".story-slide")];
    if (slides.length > 1) sawTwo = true;
    if (sawTwo && slides.length === 1 && handoverEnd == null) handoverEnd = t;
    const cur = slides[slides.length - 1];
    if (!cur) return;
    const walk = (el: Element, op: number, inOffer: boolean) => {
      const cs = getComputedStyle(el);
      const o = op * parseFloat(cs.opacity || "1") * (cs.visibility === "hidden" ? 0 : 1);
      const offer = inOffer || el.classList.contains("bjs-next");
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const live = el.classList.contains("countup-live") ? el.textContent : "";
        const sig = `${o.toFixed(2)}|${r.x.toFixed(1)}|${r.y.toFixed(1)}|${r.width.toFixed(1)}|${r.height.toFixed(1)}|${live}|${cs.clipPath}|${cs.color}|${cs.backgroundColor}|${el.getAttribute("transform") ?? ""}`;
        let s = els.get(el);
        if (!s) {
          s = { sig, first: -1, last: t, lastPre: t < cutoff ? t : 0, changes: 0, text: isText(el), op: o, inOffer: offer, cls: String(el.getAttribute("class") || el.tagName).slice(0, 48) };
          els.set(el, s);
        } else if (s.sig !== sig) {
          if (s.first < 0) s.first = t;
          s.sig = sig;
          s.last = t;
          if (t < cutoff) s.lastPre = t;
          s.changes++;
        }
        s.op = o;
        const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
        if (firstVisible == null && o > 0.1 && inView) firstVisible = t;
      }
      for (const c of el.children) walk(c, o, offer);
    };
    walk(cur, 1, false);
    if (opts.heroSel) {
      const h = cur.querySelector(opts.heroSel);
      const s = h ? els.get(h) : undefined;
      if (s) hero.push([t, s.op, s.sig]);
    }
  }

  function result(): Observation {
    const all = [...els.values()];
    // a loop: still changing now, and has been changing for a long stretch (a finite move that just ended is not)
    const isLoop = (s: El) => s.last > tNow - AMBIENT_WINDOW && s.first >= 0 && s.last - s.first > 2.5 && s.changes > 20;
    const finite = all.filter((s) => !isLoop(s));
    const pre = finite.filter((s) => !s.inOffer);
    const settleAll = Math.max(0, ...finite.map((s) => s.last));
    const settlePre = Math.max(0, ...pre.map((s) => (Number.isFinite(cutoff) ? s.lastPre : s.last)));
    const copy = Math.max(0, ...pre.filter((s) => s.text && s.op > 0.5).map((s) => (Number.isFinite(cutoff) ? s.lastPre : s.last)));
    // hero: the first moment its signature reached its final value (before any offer), fully visible
    let heroAt: number | null = null;
    const hs = hero.filter(([t]) => t < cutoff);
    if (hs.length) {
      const fin = hs[hs.length - 1];
      if (fin[1] >= 0.9) {
        heroAt = fin[0];
        for (let i = hs.length - 1; i >= 0 && hs[i][2] === fin[2] && hs[i][1] >= 0.9; i--) heroAt = hs[i][0];
      }
    }
    const hasOffer = Number.isFinite(cutoff) && all.some((s) => s.inOffer);
    return {
      observedTo: tNow,
      handoverEnd,
      firstVisible,
      heroAt,
      copyAt: copy || null,
      settleAt: hasOffer ? settlePre : settleAll,
      offerSettleAt: hasOffer ? settleAll : null,
      ambient: [...new Set(all.filter(isLoop).map((s) => s.cls))].slice(0, 8),
      stable: tNow - settleAll >= AMBIENT_WINDOW,
    };
  }

  return { sample, result };
}
