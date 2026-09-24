import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import ToastContainer from './components/ui/Toast.jsx';
import ModalRoot from './components/modals/ModalRoot.jsx';

import LoginPage from './pages/LoginPage.jsx';

// Admin pages
import AdminDashboard      from './pages/admin/AdminDashboard.jsx';
import AdminEmployees      from './pages/admin/AdminEmployees.jsx';
import AdminEmployeeDetails from './pages/admin/AdminEmployeeDetails.jsx';
import AdminAttendance     from './pages/admin/AdminAttendance.jsx';
import AdminLeaveRequests  from './pages/admin/AdminLeaveRequests.jsx';
import AdminLeaveBalances  from './pages/admin/AdminLeaveBalances.jsx';
import AdminReports        from './pages/admin/AdminReports.jsx';
import AdminNotifications  from './pages/admin/AdminNotifications.jsx';
import AdminSettings       from './pages/admin/AdminSettings.jsx';

// Employee pages
import EmpDashboard      from './pages/employee/EmpDashboard.jsx';
import EmpAttendance     from './pages/employee/EmpAttendance.jsx';
import EmpHistory        from './pages/employee/EmpHistory.jsx';
import EmpApplyLeave     from './pages/employee/EmpApplyLeave.jsx';
import EmpLeaveRequests  from './pages/employee/EmpLeaveRequests.jsx';
import EmpLeaveBalance   from './pages/employee/EmpLeaveBalance.jsx';
import EmpNotifications  from './pages/employee/EmpNotifications.jsx';
import EmpProfile        from './pages/employee/EmpProfile.jsx';

function RequireAuth({ role, children }) {
  const { state } = useApp();
  if (!state.authed) return <Navigate to="/" replace />;
  if (role && state.role !== role) {
    return <Navigate to={state.role === 'admin' ? '/admin' : '/employee'} replace />;
  }
  return children;
}

export default function App() {
  const { state } = useApp();

  return (
    <>
      <Routes>
        {/* Auth */}
        <Route
          path="/"
          element={
            state.authed
              ? <Navigate to={state.role === 'admin' ? '/admin' : '/employee'} replace />
              : <LoginPage />
          }
        />

        {/* Admin */}
        <Route path="/admin" element={<RequireAuth role="admin"><AppShell /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="employees/:empId" element={<AdminEmployeeDetails />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="leave" element={<AdminLeaveRequests />} />
          <Route path="leave-balances" element={<AdminLeaveBalances />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Employee */}
        <Route path="/employee" element={<RequireAuth role="employee"><AppShell /></RequireAuth>}>
          <Route index element={<EmpDashboard />} />
          <Route path="attendance" element={<EmpAttendance />} />
          <Route path="history" element={<EmpHistory />} />
          <Route path="apply-leave" element={<EmpApplyLeave />} />
          <Route path="leave-requests" element={<EmpLeaveRequests />} />
          <Route path="leave-balance" element={<EmpLeaveBalance />} />
          <Route path="notifications" element={<EmpNotifications />} />
          <Route path="profile" element={<EmpProfile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer />
      <ModalRoot />
    </>
  );
}
