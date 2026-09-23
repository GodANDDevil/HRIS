import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID } from '../../lib/mockData.js';
import EmptyState from '../../components/ui/EmptyState.jsx';

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/>
    <path d="M10 20a2 2 0 0 0 4 0"/>
  </svg>
);

export default function EmpNotifications() {
  const { state, dispatch } = useApp();

  const notifs = state.notifications
    .filter(n => n.audience === `employee:${CURRENT_EMP_ID}`)
    .sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-sora font-bold text-[15px]">All notifications</div>
        <button
          onClick={() => dispatch({ type: 'MARK_ALL_READ' })}
          className="text-[12.5px] font-semibold text-ink-soft hover:text-ink px-2 py-1 rounded-[8px] hover:bg-bg transition-colors">
          Mark all read
        </button>
      </div>

      {notifs.length > 0 ? notifs.map(n => (
        <div key={n.id} className="flex gap-[11px] py-[13px] border-b border-border-soft last:border-0">
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: n.read ? '#CBD5E1' : '#4F46E5' }}
          />
          <div>
            <div className="font-semibold text-[12.5px]">{n.title}</div>
            <div className="text-[12.5px] text-ink-soft mt-1">{n.msg}</div>
            <div className="text-[11.5px] text-ink-mute mt-1">{n.time}</div>
          </div>
        </div>
      )) : (
        <EmptyState
          icon={<BellIcon />}
          title="No notifications"
          subtitle="Activity on your attendance and leave will show up here."
        />
      )}
    </div>
  );
}
