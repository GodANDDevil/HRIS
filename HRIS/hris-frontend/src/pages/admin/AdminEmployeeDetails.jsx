import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { fmtDate, fmtTime, calcHours, leaveTypeLabel } from '../../lib/mockData.js';

export default function AdminEmployeeDetails() {
  const { empId } = useParams();
  const { state, dispatch } = useApp();
  const emp = state.employees.find(e => e.id === empId);

  if (!emp) return (
    <div>
      <Link to="/admin/employees" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold text-ink-soft hover:bg-bg border border-border transition-colors mb-4">
        ← Back to employees
      </Link>
      <p className="text-ink-mute">Employee not found.</p>
    </div>
  );

  const empAtt = state.attendance
    .filter(a => a.empId === empId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const empLeave = state.leaveRequests.filter(l => l.empId === empId);

  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = state.attendance.find(a => a.empId === empId && a.date === today);
  const todayStatus = todayAtt?.checkIn && !todayAtt?.checkOut ? 'Checked In'
    : todayAtt?.checkIn && todayAtt?.checkOut ? 'Checked Out' : 'Not Checked In';

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <Link to="/admin/employees"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold text-ink-soft hover:bg-bg border border-transparent hover:border-border transition-colors mb-4">
        ← Back to employees
      </Link>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        {/* Profile card */}
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5 text-center">
          <Avatar name={emp.name} size="xl" style={{ margin: '0 auto 14px', background: '#EEF2FF', color: '#3730A3' }} />
          <div className="font-bold text-[16px]">{emp.name}</div>
          <div className="text-ink-soft text-[12.5px] mt-1">{emp.position} · {emp.dept}</div>
          <div className="mt-2">
            <Badge variant={statusVariant(emp.status)} dot>{emp.status}</Badge>
          </div>
          <div className="h-px bg-border my-4" />
          <div className="flex flex-col gap-2.5 text-[13px] text-left">
            <div className="flex justify-between"><span className="text-ink-mute">Employee ID</span><span className="font-mono font-semibold">{emp.id}</span></div>
            <div className="flex justify-between"><span className="text-ink-mute">Email</span><span>{emp.email}</span></div>
            <div className="flex justify-between"><span className="text-ink-mute">Phone</span><span>{emp.phone || '—'}</span></div>
            <div className="flex justify-between items-center"><span className="text-ink-mute">Today's status</span>
              <Badge variant={statusVariant(todayStatus)} dot>{todayStatus}</Badge>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'edit-employee', editEmpId: emp.id })}
            className="mt-4 w-full inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors">
            Edit Profile Information
          </button>
        </div>

        {/* History tables */}
        <div className="flex flex-col gap-5">
          {/* Attendance */}
          <div className="bg-surface border border-border rounded-[14px] shadow-sm">
            <div className="px-5 py-4 font-sora font-bold text-[15px] border-b border-border">Recent Attendance History</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>{['Date','Check In','Check Out','Hours','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {empAtt.length > 0 ? empAtt.map(a => (
                    <tr key={a.id} className="hover:bg-[#FAFBFD]">
                      <td className={`${tdCls} font-medium`}>{a.date}</td>
                      <td className={`${tdCls} font-mono`}>{fmtTime(a.checkIn)}</td>
                      <td className={`${tdCls} font-mono`}>{fmtTime(a.checkOut)}</td>
                      <td className={`${tdCls} font-mono`}>{calcHours(a.checkIn, a.checkOut)}</td>
                      <td className={tdCls}><Badge variant={statusVariant(a.status)}>{a.status}</Badge></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="text-center py-5 text-ink-mute">No recent records.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave history */}
          <div className="bg-surface border border-border rounded-[14px] shadow-sm">
            <div className="px-5 py-4 font-sora font-bold text-[15px] border-b border-border">Leave Requests History</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>{['Type','Dates','Days','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {empLeave.length > 0 ? empLeave.map(l => (
                    <tr key={l.id} className="hover:bg-[#FAFBFD]">
                      <td className={`${tdCls} font-medium`}>{leaveTypeLabel(l.type)}</td>
                      <td className={tdCls}>{l.start} – {l.end}</td>
                      <td className={`${tdCls} font-mono`}>{l.days}</td>
                      <td className={tdCls}><Badge variant={statusVariant(l.status)}>{l.status}</Badge></td>
                    </tr>
                  )) : <tr><td colSpan={4} className="text-center py-5 text-ink-mute">No leave history recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
