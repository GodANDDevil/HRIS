import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { DEPTS, fmtTime, calcHours } from '../../lib/mockData.js';

export default function AdminAttendance() {
  const { state } = useApp();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [status, setStatus] = useState('all');

  const empMap = Object.fromEntries(state.employees.map(e => [e.id, e]));

  const records = state.attendance
    .filter(a => a.date !== new Date().toISOString().slice(0, 10) || a.checkIn)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(a => ({ ...a, emp: empMap[a.empId] }))
    .filter(a => a.emp)
    .filter(a => {
      if (q && !a.emp.name.toLowerCase().includes(q.toLowerCase()) && !a.emp.id.toLowerCase().includes(q.toLowerCase())) return false;
      if (dept !== 'all' && a.emp.dept !== dept) return false;
      if (status !== 'all' && a.status !== status) return false;
      return true;
    });

  const selectCls = 'border border-border rounded-[10px] px-3 py-2 text-[13.5px] bg-surface text-ink focus:outline-none focus:border-primary';
  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <RuleBanner>View-only monitor. Attendance records are generated strictly by employee check-ins and check-outs.</RuleBanner>

      <div className="bg-surface border border-border rounded-[14px] shadow-sm mt-5">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3.5">
            <div className="relative" style={{ width: '260px' }}>
              <svg className="absolute left-[11px] top-1/2 -translate-y-1/2 text-ink-mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
              </svg>
              <input value={q} onChange={e => setQ(e.target.value)}
                className="border border-border rounded-[10px] pl-9 pr-3 py-2 text-[13.5px] bg-surface w-full focus:outline-none focus:border-primary"
                placeholder="Search employee name or ID" />
            </div>
            <div className="text-[12.5px] text-ink-mute">{records.length} records found</div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <select value={dept} onChange={e => setDept(e.target.value)} className={selectCls}>
              <option value="all">All departments</option>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
              <option value="all">All statuses</option>
              {['Present','Late','Early Departure','Absent','Checked In'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>{['Date','Employee','Department','Check In','Check Out','Hours','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map(a => (
                <tr key={a.id} className="hover:bg-[#FAFBFD]">
                  <td className={`${tdCls} font-medium`}>{a.date}</td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.emp.name} />
                      <div>
                        <div className="font-semibold">{a.emp.name}</div>
                        <div className="text-[11.5px] text-ink-mute font-mono">{a.emp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>{a.emp.dept}</td>
                  <td className={`${tdCls} font-mono`}>{fmtTime(a.checkIn)}</td>
                  <td className={`${tdCls} font-mono`}>{fmtTime(a.checkOut)}</td>
                  <td className={`${tdCls} font-mono`}>{calcHours(a.checkIn, a.checkOut)}</td>
                  <td className={tdCls}><Badge variant={statusVariant(a.status)}>{a.status}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-8 text-ink-mute">No attendance records available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
