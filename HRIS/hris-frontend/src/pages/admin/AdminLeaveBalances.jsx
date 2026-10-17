import { useApp } from '../../context/AppContext.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { LEAVE_LIMITS } from '../../lib/mockData.js';
import { localDateIso } from '../../lib/api.js';

export default function AdminLeaveBalances() {
  const { state } = useApp();

  // Same rule as the backend (Leave.clean): APPROVED + PENDING days in the
  // last 180 days count against LEAVE_LIMITS.
  const since = (() => { const d = new Date(); d.setDate(d.getDate() - 180); return localDateIso(d); })();
  function getBalance(empId) {
    const used = { annual: 0, sick: 0, casual: 0, festive: 0 };
    state.leaveRequests
      .filter(l => l.empId === empId && ['Approved', 'Pending'].includes(l.status) && l.start >= since)
      .forEach(l => { if (used[l.type] !== undefined) used[l.type] += l.days || 0; });
    return used;
  }

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>{['Employee','Department','Annual','Sick','Casual','Festive'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {state.employees.map(e => {
              const b = getBalance(e.id);
              return (
                <tr key={e.id} className="hover:bg-[#FAFBFD]">
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={e.name} />
                      <div className="font-semibold">{e.name}</div>
                    </div>
                  </td>
                  <td className={tdCls}>{e.dept}</td>
                  {['annual', 'sick', 'casual', 'festive'].map(k => (
                    <td key={k} className={`${tdCls} font-mono`}>{LEAVE_LIMITS[k] - b[k]}/{LEAVE_LIMITS[k]}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
