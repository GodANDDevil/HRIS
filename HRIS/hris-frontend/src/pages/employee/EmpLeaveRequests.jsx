import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID, leaveTypeLabel } from '../../lib/mockData.js';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';

export default function EmpLeaveRequests() {
  const { state, dispatch, toast } = useApp();

  const requests = state.leaveRequests
    .filter(l => l.empId === CURRENT_EMP_ID)
    .sort((a, b) => b.submitted.localeCompare(a.submitted));

  function cancelLeave(id) {
    dispatch({ type: 'CANCEL_LEAVE', id });
    toast('info', 'Leave cancelled', 'Your leave request has been cancelled.');
  }

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12.5px] text-ink-mute">{requests.length} requests total</div>
        <Link to="/employee/apply-leave"
          className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 active:scale-[.98] transition-all">
          + Apply for Leave
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-[14px] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Leave Type', 'Date Range', 'Days', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? requests.map(l => (
                <tr key={l.id} className="hover:bg-[#FAFBFD]">
                  <td className={`${tdCls} font-medium`}>{leaveTypeLabel(l.type)}</td>
                  <td className={tdCls}>{l.start} – {l.end}</td>
                  <td className={`${tdCls} font-mono`}>{l.days}</td>
                  <td className={`${tdCls} font-mono`}>{l.submitted}</td>
                  <td className={tdCls}>
                    <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                  </td>
                  <td className={tdCls}>
                    {l.status === 'Pending' && (
                      <button
                        onClick={() => cancelLeave(l.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-mute">No leave requests submitted yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
