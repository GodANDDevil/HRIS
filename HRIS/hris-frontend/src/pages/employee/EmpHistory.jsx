import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID, fmtTime, calcHours } from '../../lib/mockData.js';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Chip from '../../components/ui/Chip.jsx';

const FILTERS = ['all', 'present', 'late', 'early', 'absent'];

export default function EmpHistory() {
  const { state } = useApp();
  const [filter, setFilter] = useState('all');

  const records = state.attendance
    .filter(a => a.empId === CURRENT_EMP_ID)
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(a => {
      if (filter === 'all') return true;
      if (filter === 'present') return a.status === 'Present';
      if (filter === 'late') return a.status === 'Late';
      if (filter === 'early') return a.status === 'Early Departure';
      if (filter === 'absent') return a.status === 'Absent';
      return true;
    });

  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="font-sora font-bold text-[15px]">Monthly attendance</div>
          <div className="text-[12.5px] text-ink-mute mt-0.5">Full record of your registered attendance</div>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mt-4 mb-4">
        {FILTERS.map(f => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'early' ? 'Early Departure' : f.charAt(0).toUpperCase() + f.slice(1)}
          </Chip>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr>{['Date','Check In','Check Out','Working Hours','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>
            {records.length > 0 ? records.map(r => (
              <tr key={r.id} className="hover:bg-[#FAFBFD]">
                <td className={`${tdCls} font-medium`}>{r.date}</td>
                <td className={`${tdCls} font-mono`}>{fmtTime(r.checkIn)}</td>
                <td className={`${tdCls} font-mono`}>{fmtTime(r.checkOut)}</td>
                <td className={`${tdCls} font-mono`}>{calcHours(r.checkIn, r.checkOut)}</td>
                <td className={tdCls}><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="text-center py-8 text-ink-mute">No attendance records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
