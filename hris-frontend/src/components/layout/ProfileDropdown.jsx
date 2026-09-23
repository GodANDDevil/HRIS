import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';

export default function ProfileDropdown({ role }) {
  const { logout, dispatch } = useApp();
  const navigate = useNavigate();

  function stopProp(e) { e.stopPropagation(); }

  function handleLogout(e) {
    e.stopPropagation();
    logout();
    navigate('/');
  }

  function goTo(path) {
    dispatch({ type: 'CLOSE_PROFILE' });
    navigate(path);
  }

  return (
    <div
      onClick={stopProp}
      className="absolute top-12 right-0 w-[220px] z-60 bg-surface border border-border rounded-[14px] shadow-lg p-2"
    >
      {role === 'admin' ? (
        <button
          onClick={() => goTo('/admin/settings')}
          className="flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium text-ink-soft hover:bg-bg w-full text-left transition-colors"
        >
          Account Settings
        </button>
      ) : (
        <button
          onClick={() => goTo('/employee/profile')}
          className="flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium text-ink-soft hover:bg-bg w-full text-left transition-colors"
        >
          My Profile
        </button>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium text-ink-soft hover:bg-bg w-full text-left transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
