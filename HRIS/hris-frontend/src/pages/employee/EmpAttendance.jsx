import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID } from '../../lib/mockData.js';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { useClock } from '../../hooks/useClock.js';

export default function EmpAttendance() {
  const { state, dispatch, toast } = useApp();
  const { time, date } = useClock();

  const today = new Date().toISOString().slice(0, 10);
  const todayRec = state.attendance.find(a => a.empId === CURRENT_EMP_ID && a.date === today);
  const checkedIn  = !!todayRec?.checkIn;
  const checkedOut = !!todayRec?.checkOut;
  const status = checkedIn && !checkedOut ? 'Checked In' : checkedOut ? 'Checked Out' : 'Not Checked In';

  function fmtTs(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  const last30 = state.attendance.filter(a => a.empId === CURRENT_EMP_ID && a.date < today);
  const presentDays    = last30.filter(a => ['Present','Late','Early Departure'].includes(a.status)).length;
  const lateArrivals   = last30.filter(a => a.status === 'Late').length;
  const earlyDepartures = last30.filter(a => a.status === 'Early Departure').length;
  const absentDays     = last30.filter(a => a.status === 'Absent').length;

  function checkIn() {
    dispatch({ type: 'CHECK_IN' });
    toast('success', 'Checked in', `You checked in at ${time}.`);
  }
  function checkOut() {
    dispatch({ type: 'CHECK_OUT' });
    toast('info', 'Checked out', `You checked out at ${time}.`);
  }

  return (
    <div>
      <RuleBanner>Only you can register your own attendance. Administrators can view these records but cannot check you in or out.</RuleBanner>

      {/* Pulse card */}
      <div className="mt-5 rounded-[20px] p-7 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #4F46E5 0%, #3730A3 100%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-[40px] font-semibold tracking-[.01em]">{time}</div>
            <div className="text-[13px] opacity-85 mt-0.5">{date}</div>
            <div className="flex items-center gap-[9px] mt-4">
              <span className={`w-[11px] h-[11px] rounded-full bg-white flex-shrink-0 pulse-ring ${checkedIn && !checkedOut ? 'live' : ''}`} />
              <span className="font-semibold">{status}</span>
            </div>
          </div>
          <div className="flex gap-7 flex-wrap">
            {[['Check-in', fmtTs(todayRec?.checkIn)], ['Check-out', fmtTs(todayRec?.checkOut)], ['Hours today', '0h 00m']].map(([l, v]) => (
              <div key={l}>
                <div className="text-[11px] opacity-75 uppercase tracking-[.05em]">{l}</div>
                <div className="font-mono text-[17px] font-semibold mt-0.5">{v}</div>
              </div>
            ))}
          </div>
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

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mt-5 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <StatCard icon="⏱" value={presentDays}     label="Present days"     iconBg="bg-success-50" iconColor="text-success-700" />
        <StatCard icon="⏰" value={lateArrivals}    label="Late arrivals"    iconBg="bg-warning-50" iconColor="text-warning-700" />
        <StatCard icon="🏃" value={earlyDepartures} label="Early departures" iconBg="bg-warning-50" iconColor="text-warning-700" />
        <StatCard icon="✕"  value={absentDays}      label="Absent days"      iconBg="bg-danger-50"  iconColor="text-danger-700" />
      </div>
    </div>
  );
}
