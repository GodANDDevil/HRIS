import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID } from '../../lib/mockData.js';
import StatCard from '../../components/ui/StatCard.jsx';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { useClock } from '../../hooks/useClock.js';

export default function EmpDashboard() {
  const { state, dispatch, toast } = useApp();
  const { time, date } = useClock();
  const emp = state.employees.find(e => e.id === CURRENT_EMP_ID);

  const today = new Date().toISOString().slice(0, 10);
  const todayRec = state.attendance.find(a => a.empId === CURRENT_EMP_ID && a.date === today);

  const checkedIn  = !!todayRec?.checkIn;
  const checkedOut = !!todayRec?.checkOut;
  const status = checkedIn && !checkedOut ? 'Checked In' : checkedOut ? 'Checked Out' : 'Not Checked In';

  const last30 = state.attendance.filter(a => a.empId === CURRENT_EMP_ID && a.date < today);
  const daysPresent = last30.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'Early Departure').length;
  const lateArrivals = last30.filter(a => a.status === 'Late').length;
  const absentDays   = last30.filter(a => a.status === 'Absent').length;
  const pendingLeave = state.leaveRequests.filter(l => l.empId === CURRENT_EMP_ID && l.status === 'Pending').length;

  const remaining = (state.leaveBalance.annual.total - state.leaveBalance.annual.used)
    + (state.leaveBalance.sick.total - state.leaveBalance.sick.used)
    + (state.leaveBalance.casual.total - state.leaveBalance.casual.used)
    + (state.leaveBalance.emergency.total - state.leaveBalance.emergency.used);

  function checkIn() {
    dispatch({ type: 'CHECK_IN' });
    toast('success', 'Checked in', `You checked in at ${time}.`);
  }
  function checkOut() {
    dispatch({ type: 'CHECK_OUT' });
    toast('info', 'Checked out', `You checked out at ${time}.`);
  }

  function fmtTs(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div>
      <div className="grid gap-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Pulse card */}
        <div className="rounded-[20px] p-7 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #4F46E5 0%, #3730A3 100%)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-[40px] font-semibold tracking-[.01em]">{time}</div>
              <div className="text-[13px] opacity-85 mt-0.5">{date}</div>
            </div>
            <Avatar name={emp?.name || ''} size="xl" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }} />
          </div>
          <div className="flex items-center gap-[9px] mt-4">
            <span className={`w-[11px] h-[11px] rounded-full bg-white flex-shrink-0 pulse-ring ${checkedIn && !checkedOut ? 'live' : ''}`} />
            <span className="font-semibold">{status}</span>
          </div>
          <div className="flex gap-7 mt-5 flex-wrap">
            {[['Check-in', fmtTs(todayRec?.checkIn)], ['Check-out', fmtTs(todayRec?.checkOut)], ['Hours today', '—']].map(([l, v]) => (
              <div key={l}>
                <div className="text-[11px] opacity-75 uppercase tracking-[.05em]">{l}</div>
                <div className="font-mono text-[17px] font-semibold mt-0.5">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5 flex-wrap">
            <button onClick={checkIn} disabled={checkedIn}
              className="px-6 py-3.5 rounded-[12px] font-sora font-bold text-[14.5px] bg-white text-primary-700 hover:bg-[#F0F1FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              ✓ Check In
            </button>
            <button onClick={checkOut} disabled={!checkedIn || checkedOut}
              className="px-6 py-3.5 rounded-[12px] font-sora font-bold text-[14.5px] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,.16)', border: '1.5px solid rgba(255,255,255,.55)' }}>
              ⏱ Check Out
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-sora font-bold text-[15px]">{emp?.name}</div>
              <div className="text-[12.5px] text-ink-mute">{emp?.position}</div>
            </div>
            <Avatar name={emp?.name || ''} size="lg" style={{ background: '#EEF2FF', color: '#3730A3' }} />
          </div>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex justify-between"><span className="text-ink-mute">Employee ID</span><span className="font-semibold font-mono">{emp?.id}</span></div>
            <div className="flex justify-between"><span className="text-ink-mute">Department</span><span className="font-semibold">{emp?.dept}</span></div>
            <div className="flex justify-between"><span className="text-ink-mute">Joined</span><span className="font-semibold">{emp?.join}</span></div>
            <div className="flex justify-between items-center"><span className="text-ink-mute">Status</span><Badge variant="green" dot>Active</Badge></div>
          </div>
          <div className="h-px bg-border my-4" />
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold text-[13px]">Leave balance</div>
            <Link to="/employee/leave-balance" className="text-primary text-[12px] font-semibold hover:underline">View all</Link>
          </div>
          <div className="font-bold text-[26px] font-sora">{remaining} <span className="text-[13px] text-ink-mute font-medium">days remaining</span></div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mt-5 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <StatCard icon="⏱" value={daysPresent}  label="Days present (30d)"  iconBg="bg-success-50"  iconColor="text-success-700" />
        <StatCard icon="⏰" value={lateArrivals} label="Late arrivals (30d)"  iconBg="bg-warning-50"  iconColor="text-warning-700" />
        <StatCard icon="✕"  value={absentDays}   label="Absent days (30d)"   iconBg="bg-danger-50"   iconColor="text-danger-700" />
        <StatCard icon="📋" value={pendingLeave}  label="Pending leave"       iconBg="bg-primary-50"  iconColor="text-primary-700" />
      </div>
    </div>
  );
}
