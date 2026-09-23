import { useApp } from '../../context/AppContext.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';

export default function EmpLeaveBalance() {
  const { state } = useApp();
  const { leaveBalance: b } = state;

  const rows = [
    { label: 'Annual Leave',    key: 'annual',    icon: '⚖', iconBg: 'bg-primary-50', iconColor: 'text-primary-700' },
    { label: 'Sick Leave',      key: 'sick',      icon: '⚖', iconBg: 'bg-danger-50',  iconColor: 'text-danger-700'  },
    { label: 'Casual Leave',    key: 'casual',    icon: '⚖', iconBg: 'bg-warning-50', iconColor: 'text-warning-700' },
    { label: 'Emergency Leave', key: 'emergency', icon: '⚖', iconBg: 'bg-primary-50', iconColor: 'text-primary-700' },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        {rows.map(r => (
          <StatCard
            key={r.key}
            icon={r.icon}
            value={`${b[r.key].total - b[r.key].used} / ${b[r.key].total}`}
            label={`${r.label} remaining`}
            iconBg={r.iconBg}
            iconColor={r.iconColor}
          />
        ))}
      </div>

      {/* Progress bars */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5 mt-5">
        <div className="font-sora font-bold text-[15px] mb-4">Entitlement usage</div>
        {rows.map(r => {
          const rem  = b[r.key].total - b[r.key].used;
          const used = b[r.key].used;
          const total = b[r.key].total;
          return (
            <div key={r.key} className="mb-[18px]">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-semibold">{r.label}</span>
                <span className="text-ink-mute">{used} used · {rem} remaining of {total}</span>
              </div>
              <ProgressBar value={rem} max={total} />
            </div>
          );
        })}
        <div className="text-[11.5px] text-ink-mute mt-2">
          Unpaid Leave has no annual cap. Other leave requests are reviewed individually by HR.
        </div>
      </div>
    </div>
  );
}
