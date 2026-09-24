/* ProgressBar — mirrors .progress-track / .progress-fill */
export default function ProgressBar({ value, max, color = '#4F46E5' }) {
  const pct = max > 0 ? Math.min(100, Math.round((1 - value / max) * 100)) : 0;
  // pct = used / total * 100
  const usedPct = max > 0 ? Math.min(100, Math.round(((max - value) / max) * 100)) : 0;
  return (
    <div className="h-[7px] rounded-full bg-bg overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${usedPct}%`, background: color }}
      />
    </div>
  );
}
