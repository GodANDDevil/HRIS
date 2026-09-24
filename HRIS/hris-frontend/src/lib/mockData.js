/* ============ MOCK DATA (mirrors state.js) ============ */

export const DEPTS = [
  'Engineering', 'Design', 'Sales', 'Marketing',
  'Finance', 'Human Resources', 'Operations',
];

export const LEAVE_TYPES = [
  { id: 'annual', label: 'Annual Leave' },
  { id: 'sick', label: 'Sick Leave' },
  { id: 'casual', label: 'Casual Leave' },
  { id: 'emergency', label: 'Emergency Leave' },
  { id: 'unpaid', label: 'Unpaid Leave' },
  { id: 'other', label: 'Other' },
];

function uid(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function pad(n) { return String(n).padStart(2, '0'); }

export const CURRENT_EMP_ID = 'EMP-1042';

export const ADMIN_USER = {
  name: 'Sofia Martinez',
  initials: 'SM',
  role: 'HR Administrator',
  dept: 'Human Resources',
  email: 'sofia.martinez@chronoscorp.com',
};

export const INITIAL_EMPLOYEES = [
  { id: 'EMP-1042', name: 'Aarav Shah', dept: 'Engineering', position: 'Software Engineer II', email: 'aarav.shah@chronoscorp.com', phone: '+977 98-4123-5567', join: '2022-03-14', status: 'Active' },
  { id: 'EMP-1043', name: 'Priya Nair', dept: 'Design', position: 'Product Designer', email: 'priya.nair@chronoscorp.com', phone: '+977 98-1122-4499', join: '2021-07-01', status: 'Active' },
  { id: 'EMP-1044', name: 'Miguel Santos', dept: 'Sales', position: 'Account Executive', email: 'miguel.santos@chronoscorp.com', phone: '+977 97-5567-2210', join: '2023-01-09', status: 'Active' },
  { id: 'EMP-1045', name: 'Chloe Bennett', dept: 'Marketing', position: 'Marketing Lead', email: 'chloe.bennett@chronoscorp.com', phone: '+977 98-7766-1123', join: '2020-11-23', status: 'Active' },
  { id: 'EMP-1046', name: 'Ravi Kumar', dept: 'Finance', position: 'Financial Analyst', email: 'ravi.kumar@chronoscorp.com', phone: '+977 98-2233-9987', join: '2022-09-05', status: 'Active' },
  { id: 'EMP-1047', name: 'Sofia Martinez', dept: 'Human Resources', position: 'HR Generalist', email: 'sofia.martinez@chronoscorp.com', phone: '+977 98-4455-6621', join: '2021-02-18', status: 'Active' },
  { id: 'EMP-1048', name: 'Daniel Osei', dept: 'Operations', position: 'Operations Coordinator', email: 'daniel.osei@chronoscorp.com', phone: '+977 97-3344-7788', join: '2023-06-12', status: 'Inactive' },
  { id: 'EMP-1049', name: 'Lena Fischer', dept: 'Engineering', position: 'QA Engineer', email: 'lena.fischer@chronoscorp.com', phone: '+977 98-9911-2345', join: '2022-12-01', status: 'Active' },
];

export const INITIAL_LEAVE_BALANCE = {
  annual:    { total: 18, used: 6 },
  sick:      { total: 10, used: 2 },
  casual:    { total: 8,  used: 3 },
  emergency: { total: 4,  used: 0 },
};

function buildAttendance() {
  const records = [];
  const patterns = [
    'present','present','present','late','present',
    'early','present','absent','present','present',
    'present','late','present','present',
  ];
  INITIAL_EMPLOYEES.forEach((emp, ei) => {
    for (let i = 15; i >= 1; i--) {
      const dateStr = addDays(todayIso(), -i);
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      if (dow === 0 || dow === 6) continue;
      const pattern = patterns[(i + ei * 3) % patterns.length];
      if (pattern === 'absent') {
        records.push({ id: uid('ATT'), empId: emp.id, date: dateStr, checkIn: null, checkOut: null, status: 'Absent' });
        continue;
      }
      let inH = 9, inM = 2, outH = 18, outM = 5;
      if (pattern === 'late') { inH = 9; inM = 38; }
      if (pattern === 'early') { outH = 15; outM = 40; }
      const checkIn  = `${dateStr}T${pad(inH)}:${pad(inM)}:00`;
      const checkOut = `${dateStr}T${pad(outH)}:${pad(outM)}:00`;
      const status = pattern === 'late' ? 'Late' : pattern === 'early' ? 'Early Departure' : 'Present';
      records.push({ id: uid('ATT'), empId: emp.id, date: dateStr, checkIn, checkOut, status });
    }
    // today — first employee is "checked in"
    if (emp.id === CURRENT_EMP_ID) {
      records.push({ id: uid('ATT'), empId: emp.id, date: todayIso(), checkIn: todayIso() + 'T09:02:00', checkOut: null, status: 'Checked In' });
    }
  });
  return records;
}

export const INITIAL_ATTENDANCE = buildAttendance();

export const INITIAL_LEAVE_REQUESTS = [
  { id: uid('LR'), empId: 'EMP-1042', empName: 'Aarav Shah', type: 'annual', start: addDays(todayIso(), -30), end: addDays(todayIso(), -27), days: 2, reason: 'Family trip to Pokhara.', submitted: addDays(todayIso(), -35), status: 'Approved', attachment: null },
  { id: uid('LR'), empId: 'EMP-1042', empName: 'Aarav Shah', type: 'sick', start: addDays(todayIso(), -12), end: addDays(todayIso(), -12), days: 1, reason: 'Fever and flu symptoms.', submitted: addDays(todayIso(), -12), status: 'Approved', attachment: 'medical_note.pdf' },
  { id: uid('LR'), empId: 'EMP-1043', empName: 'Priya Nair', type: 'casual', start: addDays(todayIso(), 3), end: addDays(todayIso(), 3), days: 1, reason: 'Personal errand — apartment move.', submitted: addDays(todayIso(), -1), status: 'Pending', attachment: null },
  { id: uid('LR'), empId: 'EMP-1044', empName: 'Miguel Santos', type: 'annual', start: addDays(todayIso(), 7), end: addDays(todayIso(), 11), days: 5, reason: 'Annual family vacation.', submitted: addDays(todayIso(), -2), status: 'Pending', attachment: 'itinerary.pdf' },
  { id: uid('LR'), empId: 'EMP-1046', empName: 'Ravi Kumar', type: 'emergency', start: addDays(todayIso(), -2), end: addDays(todayIso(), -1), days: 2, reason: 'Family medical emergency.', submitted: addDays(todayIso(), -2), status: 'Approved', attachment: null },
  { id: uid('LR'), empId: 'EMP-1049', empName: 'Lena Fischer', type: 'sick', start: addDays(todayIso(), 1), end: addDays(todayIso(), 2), days: 2, reason: 'Recovering from minor surgery.', submitted: addDays(todayIso(), -1), status: 'Pending', attachment: 'clinic_slip.pdf' },
  { id: uid('LR'), empId: 'EMP-1045', empName: 'Chloe Bennett', type: 'unpaid', start: addDays(todayIso(), -20), end: addDays(todayIso(), -18), days: 3, reason: 'Extended personal leave.', submitted: addDays(todayIso(), -25), status: 'Rejected', attachment: null },
  { id: uid('LR'), empId: 'EMP-1042', empName: 'Aarav Shah', type: 'casual', start: addDays(todayIso(), 14), end: addDays(todayIso(), 14), days: 1, reason: "Attending a friend's wedding.", submitted: todayIso(), status: 'Pending', attachment: null },
];

export const INITIAL_NOTIFICATIONS = [
  { id: uid('N'), audience: 'admin', title: 'New leave request', msg: 'Miguel Santos requested 5 days of Annual Leave.', time: addDays(todayIso(), -2), read: false, tone: 'blue' },
  { id: uid('N'), audience: 'admin', title: 'New leave request', msg: 'Lena Fischer requested 2 days of Sick Leave.', time: addDays(todayIso(), -1), read: false, tone: 'blue' },
  { id: uid('N'), audience: 'admin', title: 'Attendance anomaly', msg: 'Daniel Osei has 3 late arrivals this month.', time: addDays(todayIso(), -1), read: true, tone: 'amber' },
  { id: uid('N'), audience: 'admin', title: 'Incomplete attendance', msg: 'Ravi Kumar checked in but has not checked out.', time: addDays(todayIso(), -6), read: true, tone: 'red' },
  { id: uid('N'), audience: 'employee:EMP-1042', title: 'Leave approved', msg: 'Your Sick Leave request was approved by HR.', time: addDays(todayIso(), -12), read: true, tone: 'green' },
  { id: uid('N'), audience: 'employee:EMP-1042', title: 'Attendance reminder', msg: "Don't forget to check out before you leave today.", time: todayIso(), read: false, tone: 'amber' },
];

export const AUDIT_LOG = [
  { activity: 'Employee check-in', actor: 'Aarav Shah', ts: 'Today, 09:02 AM' },
  { activity: 'Leave request submitted', actor: 'Lena Fischer', ts: 'Yesterday, 10:02 AM' },
  { activity: 'Leave approved', actor: 'Sofia Martinez (HR)', ts: '2 days ago, 02:10 PM' },
  { activity: 'Employee account updated', actor: 'Sofia Martinez (HR)', ts: '3 days ago, 09:45 AM' },
  { activity: 'Leave rejected', actor: 'Sofia Martinez (HR)', ts: '25 days ago, 11:20 AM' },
  { activity: 'Attendance policy changed', actor: 'Sofia Martinez (HR)', ts: '40 days ago, 04:00 PM' },
];

export function getInitials(name = '') {
  return name.slice(0, 2).toUpperCase();
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtTime(isoDateTime) {
  if (!isoDateTime) return '—';
  const d = new Date(isoDateTime);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  const diff = (new Date(checkOut) - new Date(checkIn)) / 1000 / 60;
  const h = Math.floor(diff / 60);
  const m = Math.floor(diff % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function leaveTypeLabel(typeId) {
  return LEAVE_TYPES.find(t => t.id === typeId)?.label || typeId;
}

export function todayIso2() { return todayIso(); }
