import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { LEAVE_TYPES, leaveTypeLabel } from '../../lib/mockData.js';

export default function EmpApplyLeave() {
  const { state, actions, toast } = useApp();
  const navigate = useNavigate();
  const { leaveBalance } = state;

  const [form, setForm] = useState({ type: 'annual', start: '', end: '', reason: '', file: null });
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.start || !form.end || !form.reason) {
      toast('error', 'Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (form.end < form.start) { toast('error', 'Invalid dates', 'End date must be after start date.'); return; }

    setSubmitting(true);
    try {
      // Django computes total_days and enforces the 6-month leave limits.
      await actions.submitLeave(form);
      toast('success', 'Leave submitted', `Your ${leaveTypeLabel(form.type)} request has been submitted.`);
      navigate('/employee/leave-requests');
    } catch (err) {
      toast('error', 'Leave not submitted', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';

  const balRows = [
    { label: 'Annual Leave',  key: 'annual' },
    { label: 'Sick Leave',    key: 'sick' },
    { label: 'Casual Leave',  key: 'casual' },
    { label: 'Festive Leave', key: 'festive' },
  ].map(r => ({ ...r, total: leaveBalance[r.key]?.total ?? 0, used: leaveBalance[r.key]?.used ?? 0 }));

  return (
    <div>
      <div className="grid mt-5 gap-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Form */}
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
          <div className="font-sora font-bold text-[15px] mb-4">Leave request details</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">Leave type</label>
              <select className={inputCls} name="type" value={form.type} onChange={onChange}>
                {LEAVE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-soft">Start date</label>
                <input className={inputCls} type="date" name="start" value={form.start} onChange={onChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-soft">End date</label>
                <input className={inputCls} type="date" name="end" value={form.end} onChange={onChange} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">Reason / remarks</label>
              <textarea className={`${inputCls} resize-y min-h-[80px]`} name="reason" value={form.reason} onChange={onChange}
                placeholder="Briefly explain the reason for your leave..." required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-soft">
                Attachment <span className="text-ink-mute font-normal">(optional)</span>
              </label>
              <input className={inputCls} type="file" name="attachment"
                onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))} />
              <div className="text-[11.5px] text-ink-mute">Attach a supporting document such as a medical certificate.</div>
            </div>
            <div className="flex gap-2.5 mt-1">
              <button type="submit" disabled={submitting}
                className="disabled:opacity-60 inline-flex items-center justify-center rounded-[12px] px-6 py-4 text-[15px] font-semibold bg-primary text-white hover:bg-primary-600 active:scale-[.98] transition-all">
                {submitting ? 'Submitting…' : 'Submit Leave Request'}
              </button>
              <Link to="/employee/leave-requests"
                className="inline-flex items-center justify-center rounded-[12px] px-6 py-4 text-[15px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Balance sidebar */}
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5 self-start">
          <div className="font-sora font-bold text-[15px] mb-1">Your leave balance</div>
          <div className="text-[11.5px] text-ink-mute mb-3">Rolling 6 months · approved + pending. Other leave types have no cap.</div>
          {balRows.map(r => (
            <div key={r.key} className="mb-4">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-medium">{r.label}</span>
                <span className="text-ink-mute">{r.total - r.used}/{r.total} days left</span>
              </div>
              <ProgressBar value={r.total - r.used} max={r.total} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
