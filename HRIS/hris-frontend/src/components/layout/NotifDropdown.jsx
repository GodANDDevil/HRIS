import { useApp } from '../../context/AppContext.jsx';

export default function NotifDropdown({ notifications = [] }) {
  const { dispatch } = useApp();

  function stopProp(e) { e.stopPropagation(); }

  function markAllRead(e) {
    e.stopPropagation();
    dispatch({ type: 'MARK_ALL_READ' });
  }

  return (
    <div
      onClick={stopProp}
      className="absolute top-12 right-12 w-[340px] z-60 bg-surface border border-border rounded-[14px] shadow-lg"
    >
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="font-sora font-bold text-[14px]">Notifications</div>
          <button
            onClick={markAllRead}
            className="text-[12.5px] font-semibold text-ink-soft hover:text-ink px-2 py-1 rounded-[8px] hover:bg-bg transition-colors"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {notifications.length > 0 ? notifications.map(n => (
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
            <div className="flex flex-col items-center text-center py-12 text-ink-mute">
              <div className="w-[52px] h-[52px] rounded-full bg-bg flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>
                </svg>
              </div>
              <div className="font-semibold text-ink">No notifications</div>
              <div className="text-[12.5px] mt-1.5">You are all caught up.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
