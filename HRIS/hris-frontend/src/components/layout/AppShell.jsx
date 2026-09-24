import { Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppShell() {
  const { state, dispatch } = useApp();

  // Close dropdowns on outside click
  function handleShellClick() {
    if (state.notifOpen) dispatch({ type: 'CLOSE_NOTIF' });
    if (state.profileOpen) dispatch({ type: 'CLOSE_PROFILE' });
  }

  return (
    <div className="flex min-h-screen" onClick={handleShellClick}>
      {/* Mobile overlay */}
      {state.mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={() => dispatch({ type: 'SET_MOBILE_NAV', open: false })}
        />
      )}

      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1">
          <div className="px-7 py-6 pb-16 max-w-[1360px] w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
