import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { DEPTS } from '../../lib/mockData.js';

export default function AdminEmployees() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [status, setStatus] = useState('all');
  const [attn, setAttn] = useState('all');

  const today = new Date().toISOString().slice(0, 10);

  function getAttStatus(empId) {
    const rec = state.attendance.find(a => a.empId === empId && a.date === today);
    if (!rec) return 'Not Checked In';
    if (rec.checkIn && !rec.checkOut) return 'Checked In';
    if (rec.checkIn && rec.checkOut) return 'Checked Out';
    return 'Not Checked In';
  }

  const filtered = state.employees.filter(e => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase()) && !e.id.toLowerCase().includes(q.toLowerCase())) return false;
    if (dept !== 'all' && e.dept !== dept) return false;
    if (status !== 'all' && e.status !== status) return false;
    if (attn !== 'all' && getAttStatus(e.id) !== attn) return false;
    return true;
  });

  function toggleStatus(id, name) {
    dispatch({ type: 'TOGGLE_EMP_STATUS', id });
    toast('info', 'Status updated', `${name}'s status has been toggled.`);
  }

  const selectCls = 'border border-border rounded-[10px] px-3 py-2 text-[13.5px] bg-surface text-ink focus:outline-none focus:border-primary';
  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <RuleBanner>Admin can edit employee profile information but cannot manipulate attendance or create leave requests for them.</RuleBanner>

      <div className="bg-surface border border-border rounded-[14px] shadow-sm mt-5">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3.5">
            {/* Search */}
            <div className="relative" style={{ width: '260px' }}>
              <svg className="absolute left-[11px] top-1/2 -translate-y-1/2 text-ink-mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
              </svg>
              <input
                value={q} onChange={e => setQ(e.target.value)}
                className="border border-border rounded-[10px] pl-9 pr-3 py-2 text-[13.5px] bg-surface w-full focus:outline-none focus:border-primary"
                placeholder="Search name or ID"
              />
            </div>
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'add-employee' })}
              className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 active:scale-[.98] transition-all">
              + Add Employee
            </button>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <select value={dept} onChange={e => setDept(e.target.value)} className={selectCls}>
              <option value="all">All departments</option>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
              <option value="all">All statuses</option>
              <option>Active</option><option>Inactive</option>
            </select>
            <select value={attn} onChange={e => setAttn(e.target.value)} className={selectCls}>
              <option value="all">All attendance states</option>
              <option>Checked In</option><option>Checked Out</option><option>Not Checked In</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>{['Employee','Department','Position','Email','Attendance','Status','Actions'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const as = getAttStatus(e.id);
                return (
                  <tr key={e.id} className="hover:bg-[#FAFBFD]">
                    <td className={`${tdCls} cursor-pointer`} onClick={() => navigate(`/admin/employees/${e.id}`)}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.name} />
                        <div>
                          <div className="font-semibold">{e.name}</div>
                          <div className="text-[11.5px] text-ink-mute font-mono">{e.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>{e.dept}</td>
                    <td className={tdCls}>{e.position}</td>
                    <td className={`${tdCls} text-ink-soft`}>{e.email}</td>
                    <td className={tdCls}>
                      <Badge variant={statusVariant(as)} dot>{as}</Badge>
                    </td>
                    <td className={tdCls}>
                      <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                    </td>
                    <td className={tdCls}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'edit-employee', editEmpId: e.id })}
                          className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors">
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(e.id, e.name)}
                          className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors">
                          Power
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-ink-mute">No employees match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
