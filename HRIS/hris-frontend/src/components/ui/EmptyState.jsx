/* EmptyState — mirrors .empty-state */
export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-5 text-ink-mute">
      <div className="w-[52px] h-[52px] rounded-full bg-bg flex items-center justify-center mb-3.5 text-ink-mute">
        {icon}
      </div>
      <div className="font-semibold text-ink">{title}</div>
      {subtitle && <div className="text-[12.5px] mt-1.5">{subtitle}</div>}
    </div>
  );
}
