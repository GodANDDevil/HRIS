import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID } from '../../lib/mockData.js';
import Badge, { statusVariant } from '../../components/ui/Badge.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { useClock } from '../../hooks/useClock.js';

export default function EmpDashboard() {
  const { state, dispatch, toast } = useApp();
  const { time: liveTime, date } = useClock();
  const time = liveTime.replace(/:\d{2}(?=\s)/, '');
  const emp = state.employees.find(e => e.id === CURRENT_EMP_ID);

  const today = new Date().toISOString().slice(0, 10);
  const todayRec = state.attendance.find(a => a.empId === CURRENT_EMP_ID && a.date === today);

  const checkedIn  = !!todayRec?.checkIn;
  const checkedOut = !!todayRec?.checkOut;
  const status = checkedIn && !checkedOut ? 'Checked In' : checkedOut ? 'Checked Out' : 'Not Checked In';

  const monthKey = today.slice(0, 7);
  const monthRecords = state.attendance.filter(a => a.empId === CURRENT_EMP_ID && a.date.startsWith(monthKey));
  const presentDays = monthRecords.filter(a => ['Present', 'Late', 'Early Departure', 'Checked In'].includes(a.status)).length;
  const absentDays = monthRecords.filter(a => a.status === 'Absent').length;

  const leaveRows = [
    { key: 'annual', label: 'Annual Leave', color: '#4F46E5' },
    { key: 'sick', label: 'Sick Leave', color: '#7C3AED' },
    { key: 'casual', label: 'Casual Leave', color: '#38BDF8' },
  ];
  const leaveTypes = Object.values(state.leaveBalance);
  const totalLeave = leaveTypes.reduce((sum, leave) => sum + leave.total, 0);
  const leaveTaken = leaveTypes.reduce((sum, leave) => sum + leave.used, 0);
  const remaining = totalLeave - leaveTaken;
  const leaveUtilization = totalLeave ? Math.round((leaveTaken / totalLeave) * 100) : 0;
  const calendarDate = new Date(`${monthKey}-01T00:00:00`);
  const calendarDays = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const calendarOffset = calendarDate.getDay();
  const calendarCells = Array.from({ length: calendarOffset + calendarDays }, (_, index) => {
    if (index < calendarOffset) return null;
    const day = index - calendarOffset + 1;
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    return { day, date, record: monthRecords.find(record => record.date === date) };
  });
  const monthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-5 max-[640px]:gap-3">
        <div className="rounded-[20px] p-6 sm:p-7 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' }}>
          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full border-[34px] border-white/10" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-[.12em] text-indigo-100">Current time</div>
                <div className="font-sora text-[38px] sm:text-[44px] font-semibold tracking-[.01em] mt-1">{time}</div>
                <div className="text-[13px] text-indigo-100 mt-0.5">{date}</div>
              </div>
              <Badge variant={statusVariant(status)} dot>{status}</Badge>
            </div>
            <div className="flex gap-8 mt-6 flex-wrap">
              {[['Check-in', fmtTs(todayRec?.checkIn)], ['Check-out', fmtTs(todayRec?.checkOut)], ['Hours today', '—']].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] text-indigo-100 uppercase tracking-[.08em]">{label}</div>
                  <div className="font-mono text-[16px] font-semibold mt-1">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6 flex-wrap">
              <button onClick={checkIn} disabled={checkedIn}
                className="px-5 py-3 rounded-[11px] font-sora font-bold text-[13.5px] bg-white text-primary-700 hover:bg-[#F0F1FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                ✓ Check In
              </button>
              <button onClick={checkOut} disabled={!checkedIn || checkedOut}
                className="px-5 py-3 rounded-[11px] font-sora font-bold text-[13.5px] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: 'rgba(255,255,255,.16)', border: '1.5px solid rgba(255,255,255,.55)' }}>
                ⏱ Check Out
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[16px] shadow-sm p-5 sm:p-6 max-[640px]:p-4">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="font-sora font-bold text-[16px]">My Profile</div>
              <div className="text-[12px] text-ink-mute mt-0.5">Your employment details</div>
            </div>
            <Avatar name={emp?.name || ''} size="lg" style={{ background: '#EEF2FF', color: '#3730A3' }} />
          </div>
          <div className="grid gap-3 text-[13px]">
            {[['Employee Name', emp?.name], ['Employee ID', emp?.id], ['Department', emp?.dept], ['Position', emp?.position]].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 items-start">
                <span className="text-ink-mute">{label}</span><span className="font-semibold text-right">{value}</span>
              </div>
            ))}
          </div>
          <Link to="/employee/profile" className="inline-flex items-center gap-1.5 mt-5 text-primary text-[12.5px] font-semibold hover:underline">
            View Profile <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
        {[
          ['Present Days This Month', presentDays, 'bg-success-50', 'text-success-700', '●'],
          ['Absent Days This Month', absentDays, 'bg-danger-50', 'text-danger-700', '×'],
          ['Remaining Leave Balance', remaining, 'bg-primary-50', 'text-primary-700', '◒'],
        ].map(([label, value, iconBg, iconColor, icon]) => (
          <div key={label} className="bg-surface border border-border rounded-[14px] shadow-sm p-4 flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center text-lg ${iconBg} ${iconColor}`}>{icon}</div>
            <div><div className="font-sora font-bold text-[25px] leading-none">{value}</div><div className="text-[12px] text-ink-mute font-medium mt-1">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 max-[640px]:gap-3">
        <div className="bg-surface border border-border rounded-[16px] shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div><div className="font-sora font-bold text-[16px]">Attendance Calendar</div><div className="text-[12px] text-ink-mute mt-0.5">Your attendance overview</div></div>
            <div className="font-semibold text-[13px] text-primary">{monthLabel}</div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-mute font-semibold mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, index) => cell ? (
              <div key={cell.date} className={`aspect-square rounded-[9px] flex items-center justify-center text-[12px] font-semibold ${cell.date === today ? 'ring-2 ring-primary ring-offset-1' : ''} ${cell.record?.status === 'Absent' ? 'bg-danger-50 text-danger-700' : cell.record ? 'bg-success-50 text-success-700' : 'bg-bg text-ink-soft'}`} title={cell.record?.status || 'No record'}>{cell.day}</div>
            ) : <div key={`empty-${index}`} />)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 text-[11.5px] text-ink-mute">
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-success mr-1.5" />Present</span><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-danger mr-1.5" />Absent</span><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-bg border border-border mr-1.5" />No record</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[16px] shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4"><div><div className="font-sora font-bold text-[16px]">Leave Balance</div><div className="text-[12px] text-ink-mute mt-0.5">Utilization this year</div></div><Link to="/employee/leave-balance" className="text-primary text-[12px] font-semibold hover:underline">View details</Link></div>
          <div className="flex items-center gap-5 pb-5 border-b border-border-soft">
            <div className="relative w-[132px] h-[132px] rounded-full flex-shrink-0" style={{ background: `conic-gradient(#4F46E5 0 ${leaveUtilization}%, #E9D5FF ${leaveUtilization}% 100%)` }}>
              <div className="absolute inset-[13px] rounded-full bg-surface flex flex-col items-center justify-center"><span className="font-sora font-bold text-[25px]">{leaveUtilization}%</span><span className="text-[10px] text-ink-mute">utilized</span></div>
            </div>
            <div className="flex flex-col gap-2 text-[12px] min-w-0">
              {[['Total allocation', totalLeave, '#4F46E5'], ['Total taken', leaveTaken, '#7C3AED'], ['Remaining', remaining, '#38BDF8']].map(([label, value, color]) => <div key={label} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} /><span className="text-ink-mute">{label}</span><strong className="ml-auto text-ink">{value} days</strong></div>)}
            </div>
          </div>
          <div className="pt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-[12px]">
            {leaveRows.map(row => <div key={row.key} className="flex justify-between gap-2"><span className="text-ink-mute">{row.label} Used</span><strong>{state.leaveBalance[row.key].used} days</strong></div>)}
            <div className="flex justify-between gap-2"><span className="text-ink-mute">Remaining Balance</span><strong className="text-primary">{remaining} days</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
