/**
 * ONE video card that morphs through the Watchline's three looks — big lesson
 * player (state 01), medium lesson card (state 02), small playback tile
 * (state 03) — instead of swapping three differently designed elements.
 * Every part is always present; the sequence (watchHandoff.ts) interpolates
 * the card's box, radius and tilt, the play control's size and rings, the
 * watched bar's insets and fill, the detail layers' opacity and the tile
 * colour, so nothing pops. Drawn in code: no thumbnails, photos or screenshots,
 * and no text (labels and time are drawn as placeholder bars — PRD copy only).
 *   index 0  starts as the player (atom diagram, identity label, controls)
 *   index 1–2 start as lesson cards
 */
export function VideoCard({ index }: { index: number }) {
  return (
    <div className={`vv vv-${index}`} aria-hidden="true">
      <i className="vv-bg-a" />
      <i className="vv-bg-b" />
      {index === 0 && (
        <>
          <svg className="vv-art" viewBox="0 0 248 136">
            <ellipse cx="124" cy="68" rx="98" ry="49" transform="rotate(-24 124 68)" className="vp-orbit" />
            <ellipse cx="124" cy="68" rx="98" ry="49" transform="rotate(29 124 68)" className="vp-orbit" />
            <path d="M42 102L82 89L101 109L159 106L183 79" className="vp-path" />
            <circle cx="35" cy="52" r="8" className="vp-cyan" />
            <circle cx="204" cy="39" r="5" className="vp-yellow" />
          </svg>
          <i className="vv-id vp-dot" />
          <div className="vv-ctrl">
            <i className="vp-time" />
            <span className="vp-icons">
              <svg viewBox="0 0 24 24" className="vp-mini">
                <path d="M8 5.2c0-.8.9-1.3 1.6-.9l10 6.4c.6.4.6 1.4 0 1.8l-10 6.4c-.7.4-1.6 0-1.6-.9z" />
              </svg>
              <svg viewBox="0 0 24 24" className="vp-mini vp-out">
                <path d="M8 16L16 8M9 8h7v7" />
              </svg>
            </span>
          </div>
        </>
      )}
      <i className="vv-label" />
      <div className="vv-bar">
        <i className="vv-fill">
          <i className="vv-knob" />
        </i>
      </div>
      <span className="vv-play">
        <i className="pp-halo" />
        <i className="pp-fill" />
        <i className="pp-ring" />
        <svg viewBox="0 0 24 24" className="pp-tri">
          <path d="M8 5.2c0-.8.9-1.3 1.6-.9l10 6.4c.6.4.6 1.4 0 1.8l-10 6.4c-.7.4-1.6 0-1.6-.9z" />
        </svg>
      </span>
    </div>
  );
}
