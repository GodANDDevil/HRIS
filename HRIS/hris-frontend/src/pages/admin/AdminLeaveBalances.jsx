import { useApp } from '../../context/AppContext.jsx';
import Avatar from '../../components/ui/Avatar.jsx';

export default function AdminLeaveBalances() {
  const { state } = useApp();

  // Build per-employee balance from leave requests
  function getBalance(empId) {
    const approved = state.leaveRequests.filter(l => l.empId === empId && l.status === 'Approved');
    const used = { annual: 0, sick: 0, casual: 0, emergency: 0 };
    approved.forEach(l => { if (used[l.type] !== undefined) used[l.type] += l.days; });
    return {
      annual_rem:    18 - used.annual,
      sick_rem:      10 - used.sick,
      casual_rem:    8  - used.casual,
      emergency_rem: 4  - used.emergency,
    };
  }

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>{['Employee','Department','Annual','Sick','Casual','Emergency'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
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
                  <td className={`${tdCls} font-mono`}>{b.annual_rem}/18</td>
                  <td className={`${tdCls} font-mono`}>{b.sick_rem}/10</td>
                  <td className={`${tdCls} font-mono`}>{b.casual_rem}/8</td>
                  <td className={`${tdCls} font-mono`}>{b.emergency_rem}/4</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
