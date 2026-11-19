import type { ReactNode } from "react";
import { BADGES, CAPSTONE } from "../data/copy";
import type { BadgeId } from "../data/compose";

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
export function BadgePill({ id, art = false }: { id: BadgeId; art?: boolean }) {
  return (
    <span className="sticker">
      {art && <AssetPlaceholder label="badge art" w={28} h={28} round />}
      {BADGES[id].name}
    </span>
  );
}

/** Capstone: the one rare sticker — inverted (navy + gold rule) so it never reads as "just another badge". */
export function CapstonePill() {
  return <span className="sticker sticker-capstone">★ {CAPSTONE.name}</span>;
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
