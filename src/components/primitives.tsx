import type { ReactNode } from "react";
import type { BadgeId } from "../data/compose";
import { BADGE_ART, type BadgeArtId } from "../data/badgeArt";
import { BadgeLive } from "../badges/BadgeLive";
import { useFacet } from "../variants/facets";
import { usePrefs } from "../lib/prefs";

/** Real Shikho bird mark (from shikho-portal-redesign-v2/assets). */
export function ShikhoMark({ size = 32 }: { size?: number }) {
  return <img src="/assets/brand/shikho-bird.svg" alt="Shikho" width={size} height={size * 0.66} style={{ display: "block" }} />;
}

export function Button({
  kind,
  children,
  onClick,
}: {
  kind: "primary" | "secondary";
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`btn btn-${kind}`} onClick={onClick}>
      {children}
    </button>
  );
}

/** One primary + one (optional) secondary — the V2 action rule, enforced by shape. */
export function Actions({
  primary,
  secondary,
}: {
  primary: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="actions">
      <Button kind="primary" onClick={primary.onClick}>
        {primary.label}
      </Button>
      {secondary && (
        <Button kind="secondary" onClick={secondary.onClick}>
          {secondary.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Clearly-labelled stand-in for an asset we don't have yet.
 * Never ship; never replace with code-drawn art.
 */
export function AssetPlaceholder({ label, w, h, round }: { label: string; w?: number; h?: number; round?: boolean }) {
  // Omit w/h to let the parent size it (e.g. a responsive slot).
  return (
    <div className="asset-ph" style={{ width: w ?? "100%", height: h ?? "100%", borderRadius: round ? "50%" : 12 }} role="img" aria-label={`Placeholder: ${label}`}>
      <span>ASSET</span>
      <span>{label}</span>
    </div>
  );
}

/**
 * Badge = sticker (M2, PROPOSED treatment). A die-cut gold sticker with the
 * badge's V2 name. It is typographic on purpose: the badge ARTWORK is a
 * missing asset, and `art` is the slot it drops into — we don't draw one.
 */
/**
 * An earned badge on a story screen: its finalized artwork (Figma, 26 Nov 2026),
 * which carries the name, in place of the former text pill. Height from
 * `--badge-art-h` (default 72 px, the smallest size at which the drawn name
 * stays readable). `art` is kept for older call sites and no longer changes anything.
 */
export function BadgePill({ id, landAt, amplitude }: { id: BadgeId; art?: boolean; landAt?: number; amplitude?: number }) {
  return <BadgeReveal id={id} height="var(--badge-art-h, 72px)" className="badge-mark" landAt={landAt} amplitude={amplitude} />;
}

/**
 * A badge that lands (screen facet badge.reveal = impact, the default): live SVG
 * with the impact landing and its micro-animation, when the screen says when
 * (`landAt`, s from mount). Otherwise — the original reveal, reduced motion,
 * repeat view, no timing given — the static artwork.
 */
export function BadgeReveal({
  id,
  height,
  landAt,
  amplitude,
  decorative,
  className,
}: {
  id: BadgeArtId;
  height: number | string;
  landAt?: number;
  amplitude?: number;
  decorative?: boolean;
  className?: string;
}) {
  const reveal = useFacet("badge", "reveal");
  const { reduced, repeatView } = usePrefs();
  if (reveal === "impact" && landAt != null && !reduced && !repeatView)
    return <BadgeLive id={id} height={height} landAt={landAt} amplitude={amplitude} decorative={decorative} className={className} />;
  return <BadgeArt id={id} height={height} decorative={decorative} className={className} />;
}

/**
 * A badge's finalized artwork (data/badgeArt.ts), at its own aspect ratio. Give a
 * height or a width (px or any CSS length); the other follows. The name is part
 * of the art, so the image carries it as its accessible name unless `decorative`
 * (when the name is already written beside it).
 */
export function BadgeArt({
  id,
  height,
  width,
  decorative = false,
  className,
}: {
  id: BadgeArtId;
  height?: number | string;
  width?: number | string;
  decorative?: boolean;
  className?: string;
}) {
  const a = BADGE_ART[id];
  return (
    <img
      className={`badge-art${className ? ` ${className}` : ""}`}
      src={a.src}
      alt={decorative ? "" : a.name}
      width={a.width}
      height={a.height}
      draggable={false}
      style={{ height: height ?? "auto", width: width ?? (height != null ? "auto" : undefined), aspectRatio: `${a.width} / ${a.height}`, objectFit: "contain" }}
    />
  );
}

/** Capstone: the one rare sticker — inverted (navy + gold rule) so it never reads as "just another badge". */
export function CapstonePill({ landAt }: { landAt?: number } = {}) {
  return <BadgeReveal id="capstone" height="var(--badge-art-h, 72px)" className="badge-mark" landAt={landAt} />;
}

/**
 * The learner-type stamp (M2, PROPOSED). The single signature element of the
 * Wrap: reused on 09, the marksheet and the export so the type always looks
 * like the same mark. Typographic rubber stamp in magenta ink — no illustration.
 * Sizes scale from font-size (em), so the export renders it at 1080 px unchanged.
 */
export function Stamp({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  return (
    <div className={`stamp stamp-${size}`}>
      <span className="stamp-name">{name}</span>
      <span className="stamp-year">২০২৬</span>
    </div>
  );
}
