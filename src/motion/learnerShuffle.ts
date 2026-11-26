import gsap from "gsap";
import { easeFn } from "./ease";
import { SPRING, TEXT } from "./reference";
import { spr } from "./spring";
import { devRegister, fromGsap } from "./timeline";

const rate = 1.4;

const cues = {
  centers: [0.63, 1.09, 1.40, 1.64, 1.89, 2.27, 2.84],
  identity: 2.96,
  actions: 3.42,
  end: 3.98,
} as const;

const { centers, identity, actions, end } = cues;

export const LEARNER_SHUFFLE = {
  duration: end / rate,
  heroAt: (identity + 0.625) / rate,
  copyAt: (identity + 0.68) / rate,
} as const;
const arrival = centers[centers.length - 1];
const times = [0.25, ...centers];
const positions = [-0.85, ...centers.map((_, i) => i)];
const speeds = times.slice(1).map((time, i) => (positions[i + 1] - positions[i]) / (time - times[i]));
// Match velocity across the center marks. The shorter middle intervals speed up
// the same track, while zero velocity at both endpoints brings it to rest.
const slopes = [0, ...speeds.slice(1).map((next, i) => 2 * speeds[i] * next / (speeds[i] + next)), 0];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const progress = (t: number, start: number, duration: number) => clamp((t - start) / duration);

function trackAt(t: number) {
  if (t <= times[0]) return positions[0];
  if (t >= arrival) return positions[positions.length - 1];
  const i = times.findIndex((time) => time > t) - 1;
  const duration = times[i + 1] - times[i];
  const p = (t - times[i]) / duration;
  const p2 = p * p;
  const p3 = p2 * p;
  return (2 * p3 - 3 * p2 + 1) * positions[i]
    + (p3 - 2 * p2 + p) * duration * slopes[i]
    + (-2 * p3 + 3 * p2) * positions[i + 1]
    + (p3 - p2) * duration * slopes[i + 1];
}

export function startLearnerShuffle(root: HTMLElement, impact: () => void) {
  const nodes = [...root.querySelectorAll<HTMLElement>(".lt-shuffle-item, .lt-badge")];
  const result = nodes[nodes.length - 1];
  const shadow = root.querySelector<HTMLElement>(".lt-badge-shadow")!;
  const type = root.querySelector<HTMLElement>(".lt-type")!;
  const controls = root.querySelector<HTMLElement>(".lt-actions")!;
  const intro = root.querySelector<HTMLElement>(".lt-header")!;
  const question = intro.querySelector<HTMLElement>(".lt-question")!;
  const setup = intro.querySelector<HTMLElement>(".lt-sub")!;
  const title = type.querySelector<HTMLElement>(".lt-name")!;
  const label = type.querySelector<HTMLElement>(".lt-pre")!;
  const description = type.querySelector<HTMLElement>(".lt-reason")!;
  const flag = type.querySelector<HTMLElement>(".dev-flag");
  const pop = easeFn("refPop");
  const soft = easeFn("refSoft");
  const time = { value: 0 };
  let running = true;
  let masked: boolean | undefined;
  [shadow, type, intro, root.querySelector(".lt-shine")].forEach((el) => el?.removeAttribute("style"));

  const rise = (el: HTMLElement, p: number, y: number, alpha = 1, scale = 1) => {
    const eased = pop(p);
    el.style.opacity = String(soft(p) * alpha);
    el.style.transform = `translate3d(0,${(1 - eased) * y}px,0) scale(${scale + (1 - scale) * eased})`;
  };
  const paint = (t: number) => {
    const track = trackAt(t);
    const moving = t < arrival;
    if (masked !== moving) {
      root.toggleAttribute("data-shuffling", moving);
      masked = moving;
    }
    const entrance = soft(progress(t, 0.29, 0.28));
    const since = Math.max(0, t - arrival);
    const pulse = moving || since >= 0.67
      ? 0
      : 0.16 * (spr(since, SPRING.panel.z, SPRING.panel.wn) - spr(since, SPRING.panel.z, 8))
        * (1 - soft(progress(since, 0.42, 0.25)));
    nodes.forEach((node, i) => {
      const distance = i - track;
      const emphasis = clamp(1 - Math.abs(distance));
      if (node !== result) {
        const visibility = moving && Math.abs(distance) < 1 ? "visible" : "hidden";
        if (node.style.visibility !== visibility) node.style.visibility = visibility;
        if (visibility === "hidden") return;
      }
      const scale = 0.84 + 0.16 * emphasis + (node === result ? pulse : 0);
      node.style.transform = `translate3d(0,${distance * 89}%,0) scale(${scale})`;
      const edgeFade = 1 - clamp((Math.abs(distance) - 0.82) / 0.18);
      node.style.opacity = String(entrance * (0.17 + 0.83 * emphasis) * edgeFade);
    });
    shadow.style.opacity = String(0.45 * soft(progress(t, 0.55, 0.42)));

    rise(question, progress(t, 0, 0.58), 16, 1, TEXT.up.scale);
    setup.style.opacity = String(0.83 * soft(progress(t, 0.10, 0.52)));
    type.style.opacity = t < identity ? "0" : "1";
    type.inert = t < identity;
    rise(label, progress(t, identity, 0.40), 11, 0.86);
    rise(title, progress(t, identity + 0.075, 0.55), TEXT.up.y, 1, TEXT.up.scale);
    const caption = soft(progress(t, identity + 0.20, 0.48));
    description.style.opacity = String(0.89 * caption);
    if (flag) flag.style.opacity = String(caption);
    rise(controls, progress(t, actions, 0.52), 12);
    controls.inert = t < actions + 0.16;
  };

  paint(0);
  root.classList.remove("is-pre");
  const tl = gsap.timeline({ paused: true });
  tl.to(time, { value: end, duration: LEARNER_SHUFFLE.duration, ease: "none", onUpdate: () => paint(time.value) }, 0);
  tl.call(impact, [], arrival / rate);
  const unregister = devRegister("09 Identity Shuffle · master", fromGsap(tl));

  const images = [...root.querySelectorAll<HTMLImageElement>(".lt-stickers img")];
  const play = () => { if (running) tl.play(0); };
  if (images.every((img) => img.complete && img.naturalWidth > 0)) play();
  else void Promise.allSettled(images.map((img) => img.decode())).then(play);

  const stop = () => {
    running = false;
    tl.kill();
    unregister();
  };
  const finish = () => {
    stop();
    root.removeAttribute("data-shuffling");
    root.classList.remove("is-pre");
    [result, shadow, question, setup, type, label, title, description, flag, controls, ...nodes.slice(0, -1)]
      .forEach((el) => el?.removeAttribute("style"));
    type.inert = false;
    controls.inert = false;
  };
  return { stop, finish };
}
