import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { CURRENT_EMP_ID, LEAVE_TYPES } from '../../lib/mockData.js';

export default function EmpApplyLeave() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const { leaveBalance } = state;

  const [form, setForm] = useState({ type: 'annual', start: '', end: '', reason: '', attachment: '' });

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.start || !form.end || !form.reason) {
      toast('error', 'Missing fields', 'Please fill in all required fields.');
      return;
    }
    const start = new Date(form.start);
    const end   = new Date(form.end);
    if (end < start) { toast('error', 'Invalid dates', 'End date must be after start date.'); return; }
    const days = Math.ceil((end - start) / 86400000) + 1;
    const emp = state.employees.find(e => e.id === CURRENT_EMP_ID);
    const req = {
      id: 'LR-' + Date.now(),
      empId: CURRENT_EMP_ID,
      empName: emp?.name || 'Employee',
      type: form.type,
      start: form.start,
      end: form.end,
      days,
      reason: form.reason,
      submitted: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      attachment: form.attachment || null,
    };
    dispatch({ type: 'SUBMIT_LEAVE', req });
    toast('success', 'Leave submitted', `Your ${form.type} leave request has been submitted.`);
    navigate('/employee/leave-requests');
  }

  const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';

  const balRows = [
    { label: 'Annual Leave',    key: 'annual',    total: leaveBalance.annual.total,    used: leaveBalance.annual.used },
    { label: 'Sick Leave',      key: 'sick',      total: leaveBalance.sick.total,      used: leaveBalance.sick.used },
    { label: 'Casual Leave',    key: 'casual',    total: leaveBalance.casual.total,    used: leaveBalance.casual.used },
    { label: 'Emergency Leave', key: 'emergency', total: leaveBalance.emergency.total, used: leaveBalance.emergency.used },
  ];

  return (
    <div>
      <RuleBanner>Leave requests must originate from your own account. Administrators cannot submit a leave request on your behalf.</RuleBanner>

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
                onChange={e => setForm(f => ({ ...f, attachment: e.target.files[0]?.name || '' }))} />
              <div className="text-[11.5px] text-ink-mute">Attach a supporting document such as a medical certificate.</div>
            </div>
            <div className="flex gap-2.5 mt-1">
              <button type="submit"
                className="inline-flex items-center justify-center rounded-[12px] px-6 py-4 text-[15px] font-semibold bg-primary text-white hover:bg-primary-600 active:scale-[.98] transition-all">
                Submit Leave Request
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
          <div className="font-sora font-bold text-[15px] mb-3">Your leave balance</div>
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
