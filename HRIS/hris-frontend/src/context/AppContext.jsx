import {
  createContext, useContext, useReducer, useCallback,
} from 'react';
import {
  INITIAL_EMPLOYEES, INITIAL_ATTENDANCE, INITIAL_LEAVE_REQUESTS,
  INITIAL_NOTIFICATIONS, INITIAL_LEAVE_BALANCE, ADMIN_USER,
  CURRENT_EMP_ID,
} from '../lib/mockData';

/* ─── initial state ─── */
const initState = {
  authed: false,
  role: null,        // 'admin' | 'employee'
  user: null,
  employees: INITIAL_EMPLOYEES,
  attendance: INITIAL_ATTENDANCE,
  leaveRequests: INITIAL_LEAVE_REQUESTS,
  notifications: INITIAL_NOTIFICATIONS,
  leaveBalance: INITIAL_LEAVE_BALANCE,
  // UI
  modal: null,       // 'add-employee' | 'edit-employee' | 'leave-details'
  editEmpId: null,
  leaveDetailsId: null,
  toasts: [],
  notifOpen: false,
  profileOpen: false,
};

/* ─── reducer ─── */
function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, authed: true, role: action.role, user: action.user };
    case 'LOGOUT':
      return { ...initState };

    /* employees */
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, action.emp] };
    case 'EDIT_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(e => e.id === action.emp.id ? { ...e, ...action.emp } : e),
      };
    case 'TOGGLE_EMP_STATUS':
      return {
        ...state,
        employees: state.employees.map(e =>
          e.id === action.id ? { ...e, status: e.status === 'Active' ? 'Inactive' : 'Active' } : e),
      };

    /* attendance */
    case 'CHECK_IN': {
      const today = new Date().toISOString().slice(0, 10);
      const existing = state.attendance.find(a => a.empId === CURRENT_EMP_ID && a.date === today);
      if (existing) return state;
      const rec = {
        id: 'ATT-' + Date.now(),
        empId: CURRENT_EMP_ID,
        date: today,
        checkIn: new Date().toISOString(),
        checkOut: null,
        status: 'Checked In',
      };
      return { ...state, attendance: [...state.attendance, rec] };
    }
    case 'CHECK_OUT': {
      const today = new Date().toISOString().slice(0, 10);
      return {
        ...state,
        attendance: state.attendance.map(a =>
          a.empId === CURRENT_EMP_ID && a.date === today && a.checkIn && !a.checkOut
            ? { ...a, checkOut: new Date().toISOString(), status: 'Present' }
            : a),
      };
    }

    /* leave */
    case 'SUBMIT_LEAVE':
      return { ...state, leaveRequests: [...state.leaveRequests, action.req] };
    case 'CANCEL_LEAVE':
      return {
        ...state,
        leaveRequests: state.leaveRequests.filter(l => l.id !== action.id),
      };
    case 'APPROVE_LEAVE':
      return {
        ...state,
        leaveRequests: state.leaveRequests.map(l =>
          l.id === action.id ? { ...l, status: 'Approved' } : l),
      };
    case 'REJECT_LEAVE':
      return {
        ...state,
        leaveRequests: state.leaveRequests.map(l =>
          l.id === action.id ? { ...l, status: 'Rejected' } : l),
      };

    /* notifications */
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    /* UI */
    case 'OPEN_MODAL':
      return { ...state, modal: action.modal, editEmpId: action.editEmpId ?? null, leaveDetailsId: action.leaveDetailsId ?? null };
    case 'CLOSE_MODAL':
      return { ...state, modal: null, editEmpId: null, leaveDetailsId: null };
    case 'TOGGLE_NOTIF':
      return { ...state, notifOpen: !state.notifOpen, profileOpen: false };
    case 'CLOSE_NOTIF':
      return { ...state, notifOpen: false };
    case 'TOGGLE_PROFILE':
      return { ...state, profileOpen: !state.profileOpen, notifOpen: false };
    case 'CLOSE_PROFILE':
      return { ...state, profileOpen: false };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    default:
      return state;
  }
}

/* ─── context ─── */
const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initState);

  const toast = useCallback((type, title, msg) => {
    const id = 'T-' + Date.now();
    dispatch({ type: 'ADD_TOAST', toast: { id, type, title, msg } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 4000);
  }, []);

  const login = useCallback((role) => {
    const user = role === 'admin'
      ? ADMIN_USER
      : INITIAL_EMPLOYEES.find(e => e.id === CURRENT_EMP_ID);
    dispatch({ type: 'LOGIN', role, user });
  }, []);

  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

  return (
    <AppCtx.Provider value={{ state, dispatch, toast, login, logout }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
