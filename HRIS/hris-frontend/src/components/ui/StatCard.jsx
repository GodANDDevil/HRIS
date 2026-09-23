/* StatCard — mirrors .stat-card */
export default function StatCard({ icon, value, label, iconBg = 'bg-primary-50', iconColor = 'text-primary-700' }) {
  return (
    <div className="bg-surface border border-border rounded-[14px] p-4 shadow-sm flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 text-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="font-sora font-bold text-[26px] leading-none">{value}</div>
        <div className="text-[12.5px] text-ink-mute font-medium mt-1">{label}</div>
      </div>
    </div>
  );
}
