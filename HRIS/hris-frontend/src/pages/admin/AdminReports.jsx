import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const REPORT_TEMPLATES = [
  { title: 'Monthly attendance summary', sub: 'Present, late, absent totals per employee', btnLabel: 'Export CSV', msg: 'Monthly attendance summary prepared.' },
  { title: 'Leave utilization report', sub: 'Balance usage by leave type and department', btnLabel: 'Export CSV', msg: 'Leave utilization report prepared.' },
  { title: 'Late arrival & early departure log', sub: 'Exception report for policy review', btnLabel: 'Export CSV', msg: 'Late arrival log prepared.' },
  { title: 'Department headcount attendance', sub: 'Attendance rate by department', btnLabel: 'Export CSV', msg: 'Headcount attendance report prepared.' },
  { title: 'Audit trail export', sub: 'Full log of system actions for compliance', btnLabel: 'Export Log', msg: 'Audit trail log prepared.' },
  { title: 'Employee directory export', sub: 'Current roster with status and contact info', btnLabel: 'Export Roster', msg: 'Directory roster prepared.' },
];

export default function AdminReports() {
  const { toast } = useApp();
  const [range, setRange] = useState('This month');

  return (
    <div>
      {/* Header toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="text-[12.5px] text-ink-mute">Generate a snapshot report for any date range. Reports are read-only exports of monitored data.</div>
        <div className="flex gap-2.5">
          <select value={range} onChange={e => setRange(e.target.value)}
            className="border border-border rounded-[10px] px-3 py-2 text-[13.5px] bg-surface text-ink focus:outline-none focus:border-primary">
            {['This month','Last month','This quarter','Custom range'].map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={() => toast('success', 'Report generated', 'Your report is ready to download.')}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 active:scale-[.98] transition-all">
            📊 Generate Report
          </button>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
          <div className="font-sora font-bold text-[15px]">Attendance by department</div>
          <div className="text-[12.5px] text-ink-mute mt-0.5 mb-4">Present-days recorded, last 15 working days</div>
          {/* Simple bar chart placeholder */}
          <div className="flex items-end gap-2 h-32">
            {[72,85,60,90,55,78,66].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-[4px] bg-primary-200 hover:bg-primary transition-colors" style={{ height: `${v}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
          <div className="font-sora font-bold text-[15px] mb-4">Leave request outcomes</div>
          <div className="flex items-center gap-5">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="40" fill="none" stroke="#DCFCE7" strokeWidth="18" />
              <circle cx="55" cy="55" r="40" fill="none" stroke="#4F46E5" strokeWidth="18"
                strokeDasharray="150 102" strokeDashoffset="25" />
              <circle cx="55" cy="55" r="40" fill="none" stroke="#FEE2E2" strokeWidth="18"
                strokeDasharray="50 202" strokeDashoffset="-125" />
            </svg>
            <div className="flex flex-col gap-2 text-[12.5px]">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Approved</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-danger-100 inline-block" />Rejected</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-success-100 inline-block" />Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Report templates */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
        <div className="font-sora font-bold text-[15px] mb-4">Available report templates</div>
        <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
          {REPORT_TEMPLATES.map(r => (
            <div key={r.title} className="bg-bg border border-border rounded-[14px] p-4">
              <div className="font-semibold text-[13px]">{r.title}</div>
              <div className="text-[11.5px] text-ink-mute mt-1.5">{r.sub}</div>
              <button onClick={() => toast('success', 'Exporting', r.msg)}
                className="mt-3 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-white transition-colors">
                {r.btnLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
