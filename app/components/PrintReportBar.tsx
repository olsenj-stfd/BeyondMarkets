"use client";

/** Small toolbar on the shared report page; hidden when printing. */
export default function PrintReportBar() {
  return (
    <div className="print-bar no-print">
      <span className="muted">RegScout portfolio report — shared snapshot</span>
      <button type="button" className="pill-btn" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
    </div>
  );
}
