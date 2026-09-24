import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import { AUDIT_LOG } from '../../lib/mockData.js';

export default function AdminSettings() {
  const { toast } = useApp();
  const [policy, setPolicy] = useState({ start_time: '09:00', grace_period: '15', work_hours: '8', early_threshold: '8' });
  const [leave, setLeave] = useState({ annual: '18', sick: '10', casual: '8', emergency: '4' });

  const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';
  const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
  const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';

  return (
    <div>
      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        {/* Attendance policy */}
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
          <div className="font-sora font-bold text-[15px]">Attendance policy</div>
          <div className="text-[12.5px] text-ink-mute mt-0.5 mb-4">Defines how the system automatically classifies check-ins</div>
          <form onSubmit={e => { e.preventDefault(); toast('success', 'Saved', 'Attendance policy updated.'); }}
            className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">Standard start time</label>
              <input className={inputCls} type="time" value={policy.start_time} onChange={e => setPolicy(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">Late arrival grace period (minutes)</label>
              <input className={inputCls} type="number" value={policy.grace_period} onChange={e => setPolicy(p => ({ ...p, grace_period: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">Standard working hours per day</label>
              <input className={inputCls} type="number" value={policy.work_hours} onChange={e => setPolicy(p => ({ ...p, work_hours: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">Early departure threshold (hours)</label>
              <input className={inputCls} type="number" value={policy.early_threshold} onChange={e => setPolicy(p => ({ ...p, early_threshold: e.target.value }))} />
            </div>
            <button type="submit"
              className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 mt-2 transition-colors">
              Save policy
            </button>
          </form>
        </div>

        {/* Leave policy */}
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
          <div className="font-sora font-bold text-[15px]">Leave policy</div>
          <div className="text-[12.5px] text-ink-mute mt-0.5 mb-4">Annual entitlement per leave type</div>
          <form onSubmit={e => { e.preventDefault(); toast('success', 'Saved', 'Leave policy updated.'); }}
            className="flex flex-col gap-3.5">
            {[['Annual Leave', 'annual'], ['Sick Leave', 'sick'], ['Casual Leave', 'casual'], ['Emergency Leave', 'emergency']].map(([label, key]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-soft">{label} (days/year)</label>
                <input className={inputCls} type="number" value={leave[key]} onChange={e => setLeave(l => ({ ...l, [key]: e.target.value }))} />
              </div>
            ))}
            <button type="submit"
              className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 mt-2 transition-colors">
              Save policy
            </button>
          </form>
        </div>
      </div>

      {/* System rule */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5 mt-5">
        <div className="font-sora font-bold text-[15px]">System rule</div>
        <div className="text-[12.5px] text-ink-mute mt-0.5 mb-3.5">This cannot be disabled — it is core to the platform</div>
        <RuleBanner>
          Employees register their own attendance and leave. Administrators cannot check employees in/out, create attendance records, or submit leave on their behalf. All timestamps are system-generated and cannot be manually edited.
        </RuleBanner>
      </div>

      {/* Audit log */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5 mt-5">
        <div className="font-sora font-bold text-[15px] mb-3">Audit log</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{['Activity','Actor','Timestamp'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {AUDIT_LOG.map((row, i) => (
                <tr key={i} className="hover:bg-[#FAFBFD]">
                  <td className={`${tdCls} font-medium`}>{row.activity}</td>
                  <td className={tdCls}>{row.actor}</td>
                  <td className={`${tdCls} font-mono`}>{row.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
