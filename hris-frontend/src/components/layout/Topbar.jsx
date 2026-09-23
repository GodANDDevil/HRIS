import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID } from '../../lib/mockData.js';
import NotifDropdown from './NotifDropdown.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';
import { getInitials } from '../../lib/mockData.js';

const PAGE_META = {
  '/admin':              ['Dashboard',         'Organization attendance & leave overview'],
  '/admin/employees':    ['Employees',         'Directory and profile management'],
  '/admin/attendance':   ['Attendance Records','View-only — generated from employee check-ins'],
  '/admin/leave':        ['Leave Requests',    'Review, approve, or reject requests'],
  '/admin/leave-balances':['Leave Balances',   'Entitlement usage across the organization'],
  '/admin/reports':      ['Reports',           'Generate and export attendance & leave reports'],
  '/admin/notifications':['Notifications',     'System and account alerts'],
  '/admin/settings':     ['Settings',          'Attendance and leave policy configuration'],
  '/employee':           ['Dashboard',         'Your day at a glance'],
  '/employee/attendance':['My Attendance',     'Register today\'s check-in and check-out'],
  '/employee/history':   ['Attendance History','Your full attendance record'],
  '/employee/apply-leave':['Apply for Leave',  'Submit a new leave request'],
  '/employee/leave-requests':['My Leave Requests','Track the status of your requests'],
  '/employee/leave-balance': ['Leave Balance', 'Your entitlements this year'],
  '/employee/notifications': ['Notifications', 'Recent activity on your account'],
  '/employee/profile':       ['My Profile',    'Your personal and role information'],
};

export default function Topbar() {
  const { state, dispatch } = useApp();
  const location = useLocation();

  // Match path (handle nested routes like /admin/employees/EMP-xxx)
  const matchedKey = Object.keys(PAGE_META).find(k => location.pathname === k)
    || Object.keys(PAGE_META).find(k => location.pathname.startsWith(k + '/'))
    || location.pathname;
  const [title, sub] = PAGE_META[matchedKey] || ['Chronos', 'Welcome'];

  const isEmp = state.role === 'employee';
  const person = state.user;
  const audienceKey = isEmp ? `employee:${CURRENT_EMP_ID}` : 'admin';
  const myNotifs = (state.notifications || []).filter(n => n.audience === audienceKey);
  const unread = myNotifs.filter(n => !n.read).length;

  function onNotifBtn(e) {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_NOTIF' });
  }
  function onProfileBtn(e) {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_PROFILE' });
  }

  return (
    <div className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-[15] gap-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="font-sora font-bold text-[17px]">{title}</div>
          <div className="text-[12px] text-ink-mute">{sub}</div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5 relative">
        {/* Notification bell */}
        <button
          id="notif-btn"
          onClick={onNotifBtn}
          className="w-[38px] h-[38px] rounded-[10px] border border-border bg-surface flex items-center justify-center relative text-ink-soft hover:bg-bg transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>
          </svg>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border-2 border-white" />
          )}
        </button>

        {state.notifOpen && <NotifDropdown notifications={myNotifs} />}

        {/* Profile chip */}
        <button
          id="profile-btn"
          onClick={onProfileBtn}
          className="flex items-center gap-[9px] pl-[5px] pr-2.5 py-[5px] rounded-full border border-border bg-surface hover:bg-bg transition-colors"
        >
          <div className="w-[30px] h-[30px] rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-[12px] font-sora flex-shrink-0">
            {person ? getInitials(person.name) : '?'}
          </div>
          <div className="text-left hidden md:block">
            <div className="font-semibold text-[13px] leading-[1.2]">{person?.name}</div>
            <div className="text-[11.5px] text-ink-mute leading-[1.2]">
              {isEmp ? person?.id || 'EMP' : 'HR Administrator'}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {state.profileOpen && <ProfileDropdown role={state.role} />}
      </div>
    </div>
  );
}
