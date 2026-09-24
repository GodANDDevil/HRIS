import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import { leaveTypeLabel } from '../../lib/mockData.js';

export default function AdminDashboard() {
  const { state, dispatch, toast } = useApp();
  const { employees, attendance, leaveRequests } = state;

  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter(a => a.date === today);
  const totalEmployees = employees.length;
  const presentToday = todayAtt.filter(a => a.status !== 'Absent').length;
  const checkedIn = todayAtt.filter(a => a.checkIn && !a.checkOut).length;
  const checkedOut = todayAtt.filter(a => a.checkIn && a.checkOut).length;
  const lateToday = todayAtt.filter(a => a.status === 'Late').length;
  const absentToday = employees.length - presentToday;
  const pendingLeave = leaveRequests.filter(l => l.status === 'Pending');
  const onLeave = leaveRequests.filter(l => l.status === 'Approved' && l.start <= today && l.end >= today).length;

  function approve(id) {
    dispatch({ type: 'APPROVE_LEAVE', id });
    toast('success', 'Leave approved', 'The leave request has been approved.');
  }
  function reject(id) {
    dispatch({ type: 'REJECT_LEAVE', id });
    toast('info', 'Leave rejected', 'The leave request has been rejected.');
  }

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <RuleBanner>
        Employees register their own attendance and leave. Admin/HR only monitors attendance and processes leave requests.
      </RuleBanner>

      {/* Row 1 stat cards */}
      <div className="grid grid-cols-4 gap-4 mt-5 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <StatCard icon="👥" value={totalEmployees} label="Total employees" iconBg="bg-primary-50" iconColor="text-primary-700" />
        <StatCard icon="✓"  value={presentToday}   label="Present today"   iconBg="bg-success-50" iconColor="text-success-700" />
        <StatCard icon="⏱" value={checkedIn}       label="Checked in"     iconBg="bg-primary-50" iconColor="text-primary-700" />
        <StatCard icon="🏁" value={checkedOut}      label="Checked out"    iconBg="bg-[#F1F5F9]"  iconColor="text-ink-soft" />
      </div>

      {/* Row 2 stat cards */}
      <div className="grid grid-cols-4 gap-4 mt-4 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <StatCard icon="⏰" value={lateToday}          label="Late today"               iconBg="bg-warning-50" iconColor="text-warning-700" />
        <StatCard icon="✕"  value={absentToday}        label="Absent today"             iconBg="bg-danger-50"  iconColor="text-danger-700" />
        <StatCard icon="📋" value={pendingLeave.length} label="Pending leave requests"  iconBg="bg-warning-50" iconColor="text-warning-700" />
        <StatCard icon="🌴" value={onLeave}             label="Employees on leave"      iconBg="bg-primary-50" iconColor="text-primary-700" />
      </div>

      {/* Pending leave table */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="font-sora font-bold text-[15px]">Pending leave requests requiring action</div>
          </div>
          <Link to="/admin/leave" className="text-primary text-[12px] font-semibold hover:underline">Review all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Employee','Leave Type','Dates','Days','Submitted','Actions'].map(h => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingLeave.length > 0 ? pendingLeave.map(l => (
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
                  <td className={tdCls}>
                    <div className="flex gap-1.5">
                      <button onClick={() => approve(l.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-success text-white hover:bg-success-700 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => reject(l.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-danger text-white hover:bg-danger-700 transition-colors">
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-ink-mute">No pending leave requests right now.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
