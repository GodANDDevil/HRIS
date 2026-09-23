import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';

/* ── SVG Icons ── */
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/>
    <rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>
  </svg>
);
const PeopleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/>
    <circle cx="17" cy="8" r="3"/><path d="M23 21c0-3.5-2-6-5-6.8"/>
  </svg>
);
const AttIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
);
const HistIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 3"/>
  </svg>
);
const LeaveCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 15l2 2 4-4"/>
  </svg>
);
const LeaveApplyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M12 14v6M9 17h6"/>
  </svg>
);
const BalanceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/>
  </svg>
);
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>
  </svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
  </svg>
);
const BarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V10M12 20V4M20 20v-7"/>
  </svg>
);
const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>
  </svg>
);

/* ── Nav item helper ── */
function NavItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end={to.split('/').length <= 2}
      className={({ isActive }) =>
        `flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium mb-0.5 no-underline transition-colors duration-100 ${
          isActive
            ? 'bg-primary-50 text-primary-700 font-semibold'
            : 'text-ink-soft hover:bg-bg'
        }`
      }
    >
      <span className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">{icon}</span>
      {children}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] uppercase tracking-[.06em] text-ink-mute font-semibold px-[10px] pt-[14px] pb-[6px]">
      {children}
    </div>
  );
}

export default function Sidebar() {
  const { state, logout } = useApp();
  const navigate = useNavigate();
  const isAdmin = state.role === 'admin';

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="w-[248px] flex-shrink-0 bg-surface border-r border-border flex flex-col sticky top-0 h-screen z-20">
      {/* Brand */}
      <div className="flex items-center gap-[10px] px-5 pt-5 pb-4">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-white font-sora font-bold text-[15px] flex-shrink-0">
          CH
        </div>
        <div>
          <div className="font-sora font-bold text-[16px] text-ink">Chronos</div>
          <div className="text-[11px] text-ink-mute -mt-0.5">
            {isAdmin ? 'Admin / HR Portal' : 'Employee Portal'}
          </div>
        </div>
      </div>

      {/* Role banner */}
      <div className="mx-3 mb-1 px-3 py-2.5 rounded-[10px] bg-primary-50 border border-primary-100 text-[11.5px] leading-[1.45] text-primary-700">
        <b className="block text-[11px] uppercase tracking-[.04em] mb-[3px]">
          {isAdmin ? 'Monitoring only' : 'Self-service rule'}
        </b>
        {isAdmin
          ? 'You monitor, approve, and report. You cannot check employees in/out or file leave for them.'
          : 'You register your own attendance and leave. No one can do this for you.'}
      </div>

      {/* Navigation */}
      <nav className="px-3 flex-1 overflow-y-auto py-2">
        {isAdmin ? (
          <>
            <SectionLabel>Overview</SectionLabel>
            <NavItem to="/admin" icon={<DashboardIcon />}>Dashboard</NavItem>

            <SectionLabel>People</SectionLabel>
            <NavItem to="/admin/employees" icon={<PeopleIcon />}>Employees</NavItem>

            <SectionLabel>Monitoring</SectionLabel>
            <NavItem to="/admin/attendance" icon={<AttIcon />}>Attendance</NavItem>
            <NavItem to="/admin/leave" icon={<LeaveCheckIcon />}>Leave Requests</NavItem>
            <NavItem to="/admin/leave-balances" icon={<BalanceIcon />}>Leave Balances</NavItem>

            <SectionLabel>Insights</SectionLabel>
            <NavItem to="/admin/reports" icon={<BarIcon />}>Reports</NavItem>
            <NavItem to="/admin/notifications" icon={<BellIcon />}>Notifications</NavItem>

            <SectionLabel>System</SectionLabel>
            <NavItem to="/admin/settings" icon={<GearIcon />}>Settings</NavItem>
          </>
        ) : (
          <>
            <SectionLabel>Workspace</SectionLabel>
            <NavItem to="/employee" icon={<DashboardIcon />}>Dashboard</NavItem>
            <NavItem to="/employee/attendance" icon={<ClockIcon />}>My Attendance</NavItem>
            <NavItem to="/employee/history" icon={<HistIcon />}>Attendance History</NavItem>

            <SectionLabel>Leave</SectionLabel>
            <NavItem to="/employee/apply-leave" icon={<LeaveApplyIcon />}>Apply for Leave</NavItem>
            <NavItem to="/employee/leave-requests" icon={<LeaveCheckIcon />}>My Leave Requests</NavItem>
            <NavItem to="/employee/leave-balance" icon={<BalanceIcon />}>Leave Balance</NavItem>

            <SectionLabel>Account</SectionLabel>
            <NavItem to="/employee/notifications" icon={<BellIcon />}>Notifications</NavItem>
            <NavItem to="/employee/profile" icon={<UserIcon />}>My Profile</NavItem>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-[14px] border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium text-ink-soft hover:bg-bg w-full text-left transition-colors"
        >
          <span className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center"><LogoutIcon /></span>
          Logout
        </button>
      </div>
    </div>
  );
}
