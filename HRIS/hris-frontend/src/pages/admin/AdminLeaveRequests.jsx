import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Chip from '../../components/ui/Chip.jsx';
import { leaveTypeLabel } from '../../lib/mockData.js';

const TABS = ['pending', 'approved', 'rejected', 'all'];

export default function AdminLeaveRequests() {
  const { state, dispatch, toast } = useApp();
  const [tab, setTab] = useState('pending');

  const filtered = state.leaveRequests.filter(l => {
    if (tab === 'all') return true;
    return l.status.toLowerCase() === tab;
  });

  function approve(id, name) {
    dispatch({ type: 'APPROVE_LEAVE', id });
    toast('success', 'Leave approved', `${name}'s leave has been approved.`);
  }
  function reject(id, name) {
    dispatch({ type: 'REJECT_LEAVE', id });
    toast('info', 'Leave rejected', `${name}'s leave has been rejected.`);
  }
  function view(id) {
    dispatch({ type: 'OPEN_MODAL', modal: 'leave-details', leaveDetailsId: id });
  }

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <RuleBanner>Admin / HR can approve or reject leave requests submitted by employees, but cannot create leave requests for them.</RuleBanner>

      <div className="bg-surface border border-border rounded-[14px] shadow-sm mt-5">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map(t => (
              <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>{['Employee','Leave Type','Dates','Days','Submitted','Status','Actions'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(l => (
                <tr key={l.id} className="hover:bg-[#FAFBFD]">
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={l.empName} />
                      <div>
                        <div className="font-semibold">{l.empName}</div>
                        <div className="text-[11.5px] text-ink-mute font-mono">{l.empId}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdCls} font-medium`}>{leaveTypeLabel(l.type)}</td>
                  <td className={tdCls}>{l.start} – {l.end}</td>
                  <td className={`${tdCls} font-mono`}>{l.days}</td>
                  <td className={`${tdCls} font-mono`}>{l.submitted}</td>
                  <td className={tdCls}><Badge variant={statusVariant(l.status)}>{l.status}</Badge></td>
                  <td className={tdCls}>
                    <div className="flex gap-1.5">
                      <button onClick={() => view(l.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors">
                        View
                      </button>
                      {l.status === 'Pending' && (
                        <>
                          <button onClick={() => approve(l.id, l.empName)}
                            className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-success text-white hover:bg-success-700 transition-colors">
                            Approve
                          </button>
                          <button onClick={() => reject(l.id, l.empName)}
                            className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-danger text-white hover:bg-danger-700 transition-colors">
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-8 text-ink-mute">No leave requests in this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
