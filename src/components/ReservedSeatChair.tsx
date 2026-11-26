/** The chair, front view (the original screen's chair geometry, with its lip). */
export function ChairShapes({ lip }: { lip?: boolean }) {
  return (
    <>
      <rect x="16" y="0" width="68" height="68" rx="16" />
      <rect x="8" y="73" width="84" height="21" rx="10.5" />
      <rect x="17" y="91" width="9" height="41" rx="3" />
      <rect x="74" y="91" width="9" height="41" rx="3" />
      {lip && <rect x="24" y="5" width="52" height="4" rx="2" className="lr-lip" />}
    </>
  );
}
