import {
  createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef,
} from 'react';
import {
  api, clearApiSession, hasStoredSession, listOf, localDateIso,
  normalizeAttendance, normalizeEmployee, normalizeLeave,
} from '../lib/api.js';
import { LEAVE_LIMITS, leaveTypeLabel } from '../lib/mockData.js';

/* ─── initial state ─── */
const initState = {
  booting: hasStoredSession(), // true while restoring a saved login on refresh
  authed: false,
  role: null,          // 'admin' | 'employee'
  user: null,          // normalized employee profile of the logged-in user
  currentEmpId: null,  // string id of the logged-in employee
  loading: false,
  employees: [],
  departments: [],
  attendance: [],
  leaveRequests: [],
  readNotifIds: [],
  // UI
  modal: null,       // 'add-employee' | 'edit-employee' | 'leave-details'
  editEmpId: null,
  leaveDetailsId: null,
  toasts: [],
  notifOpen: false,
  profileOpen: false,
  mobileNavOpen: false,
};

/* ─── reducer ─── */
function reducer(state, action) {
  switch (action.type) {
    case 'BOOT_DONE':
      return { ...state, booting: false };
    case 'LOGIN':
      return {
        ...state,
        booting: false,
        authed: true,
        role: action.role,
        user: action.user,
        currentEmpId: action.user?.id ?? null,
      };
    case 'LOGOUT':
      return { ...initState, booting: false };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_DATA':
      return { ...state, ...action.data };

    /* employees */
    case 'UPSERT_EMPLOYEE': {
      const exists = state.employees.some(e => e.id === action.emp.id);
      return {
        ...state,
        employees: exists
          ? state.employees.map(e => (e.id === action.emp.id ? action.emp : e))
          : [...state.employees, action.emp],
      };
    }

    /* attendance */
    case 'UPSERT_ATTENDANCE': {
      const exists = state.attendance.some(a => a.id === action.rec.id);
      return {
        ...state,
        attendance: exists
          ? state.attendance.map(a => (a.id === action.rec.id ? action.rec : a))
          : [action.rec, ...state.attendance],
      };
    }

    /* leave */
    case 'UPSERT_LEAVE': {
      const exists = state.leaveRequests.some(l => l.id === action.req.id);
      return {
        ...state,
        leaveRequests: exists
          ? state.leaveRequests.map(l => (l.id === action.req.id ? action.req : l))
          : [action.req, ...state.leaveRequests],
      };
    }
    case 'REMOVE_LEAVE':
      return { ...state, leaveRequests: state.leaveRequests.filter(l => l.id !== action.id) };

    /* notifications */
    case 'MARK_ALL_READ':
      return { ...state, readNotifIds: action.ids };

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
    case 'SET_MOBILE_NAV':
      return { ...state, mobileNavOpen: action.open };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    default:
      return state;
  }
}

/* ─── derived data (replaces the old mock leaveBalance / notifications) ─── */
function sixMonthsAgoIso() {
  const d = new Date();
  d.setDate(d.getDate() - 180);
  return localDateIso(d);
}

function buildLeaveBalance(leaves, empId) {
  // Same rule the backend enforces in Leave.clean(): APPROVED + PENDING
  // days in the last 180 days count against the limit.
  const since = sixMonthsAgoIso();
  const balance = {};
  Object.entries(LEAVE_LIMITS).forEach(([key, total]) => {
    const used = leaves
      .filter(l => l.empId === empId && l.type === key && ['Approved', 'Pending'].includes(l.status) && l.start >= since)
      .reduce((sum, l) => sum + (l.days || 0), 0);
    balance[key] = { total, used };
  });
  return balance;
}

function buildNotifications(state) {
  if (!state.authed) return [];
  const today = localDateIso();
  if (state.role === 'admin') {
    return state.leaveRequests
      .filter(l => l.status === 'Pending')
      .map(l => ({
        id: `leave-${l.id}`,
        audience: 'admin',
        title: 'New leave request',
        msg: `${l.empName} requested ${l.days} day${l.days === 1 ? '' : 's'} of ${leaveTypeLabel(l.type)}.`,
        time: l.submitted,
        tone: 'blue',
      }));
  }
  const audience = `employee:${state.currentEmpId}`;
  const items = state.leaveRequests
    .filter(l => l.empId === state.currentEmpId && l.status !== 'Pending')
    .map(l => ({
      id: `leave-${l.id}-${l.status}`,
      audience,
      title: `Leave ${l.status.toLowerCase()}`,
      msg: `Your ${leaveTypeLabel(l.type)} request (${l.start} – ${l.end}) was ${l.status.toLowerCase()} by HR.`,
      time: l.submitted,
      tone: l.status === 'Approved' ? 'green' : 'red',
    }));
  const todayRec = state.attendance.find(a => a.empId === state.currentEmpId && a.date === today);
  if (todayRec?.checkIn && !todayRec?.checkOut) {
    items.unshift({
      id: `checkout-${today}`,
      audience,
      title: 'Attendance reminder',
      msg: "Don't forget to check out before you leave today.",
      time: today,
      tone: 'amber',
    });
  }
  return items;
}

/* ─── context ─── */
const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initState);

  const toast = useCallback((type, title, msg) => {
    const id = 'T-' + Date.now() + Math.random();
    dispatch({ type: 'ADD_TOAST', toast: { id, type, title, msg } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 4000);
  }, []);

  /** Fetch everything the current user is allowed to see. */
  const loadData = useCallback(async (role, me) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const [employees, departments, attendance, leaves] = await Promise.all([
        role === 'admin' ? api.employees() : Promise.resolve([me]),
        api.departments().catch(() => []),
        api.attendance(),
        api.leaves(),
      ]);
      dispatch({
        type: 'SET_DATA',
        data: {
          employees: listOf(employees).map(e => (e.pk ? e : normalizeEmployee(e))),
          departments: listOf(departments),
          attendance: listOf(attendance).map(normalizeAttendance),
          leaveRequests: listOf(leaves).map(normalizeLeave),
        },
      });
    } catch (err) {
      toast('error', 'Could not load data', err.message);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [toast]);

  /** Call after the JWT is stored. Resolves the role from /api/me/. */
  const startSession = useCallback(async () => {
    const meRaw = await api.me();
    const me = normalizeEmployee(meRaw);
    const role = meRaw.is_hr ? 'admin' : 'employee';
    dispatch({ type: 'LOGIN', role, user: me });
    await loadData(role, me);
    return role;
  }, [loadData]);

  const logout = useCallback(() => {
    clearApiSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Restore the session after a page refresh instead of logging the user out.
  const restoreStarted = useRef(false); // StrictMode runs effects twice in dev
  useEffect(() => {
    if (!hasStoredSession() || restoreStarted.current) return;
    restoreStarted.current = true;
    startSession().catch(() => {
      clearApiSession();
      dispatch({ type: 'BOOT_DONE' });
    });
  }, [startSession]);

  /* ─── API-backed actions used by pages ─── */
  const actions = useMemo(() => ({
    refresh: () => loadData(state.role, state.user),

    async checkIn() {
      const rec = await api.checkIn(state.user.pk);
      dispatch({ type: 'UPSERT_ATTENDANCE', rec: normalizeAttendance(rec) });
      return rec;
    },
    async checkOut() {
      const rec = await api.checkOut(state.user.pk);
      dispatch({ type: 'UPSERT_ATTENDANCE', rec: normalizeAttendance(rec) });
      return rec;
    },

    async submitLeave({ type, start, end, reason, file }) {
      const fd = new FormData();
      fd.append('leave_type', type.toUpperCase());
      fd.append('start_date', start);
      fd.append('end_date', end);
      fd.append('reason', reason);
      if (file) fd.append('document', file);
      const leave = await api.createLeave(fd);
      dispatch({ type: 'UPSERT_LEAVE', req: normalizeLeave(leave) });
      return leave;
    },
    async cancelLeave(id) {
      await api.cancelLeave(id);
      dispatch({ type: 'REMOVE_LEAVE', id: String(id) });
    },
    async reviewLeave(id, status) {
      const leave = await api.reviewLeave(id, status);
      dispatch({ type: 'UPSERT_LEAVE', req: normalizeLeave(leave) });
      return leave;
    },

    async createEmployee(payload) {
      const emp = normalizeEmployee(await api.createEmployee(payload));
      dispatch({ type: 'UPSERT_EMPLOYEE', emp });
      return emp;
    },
    async updateEmployee(id, payload) {
      const emp = normalizeEmployee(await api.updateEmployee(id, payload));
      dispatch({ type: 'UPSERT_EMPLOYEE', emp });
      return emp;
    },

    /* departments — the backend only allows the HR Department Head */
    async createDepartment(payload) {
      const dept = await api.createDepartment(payload);
      await loadData(state.role, state.user);
      return dept;
    },
    async updateDepartment(id, payload) {
      const dept = await api.updateDepartment(id, payload);
      // reload so renamed departments show up on employees too
      await loadData(state.role, state.user);
      return dept;
    },
    async deleteDepartment(id) {
      await api.deleteDepartment(id);
      await loadData(state.role, state.user);
    },
  }), [loadData, state.role, state.user]);

  const derivedState = useMemo(() => {
    const notifications = buildNotifications(state).map(n => ({
      ...n,
      read: state.readNotifIds.includes(n.id),
    }));
    return {
      ...state,
      // Only the HR Department Head may add / edit / delete departments.
      isHRHead: state.role === 'admin' && state.user?.role === 'HEAD',
      notifications,
      leaveBalance: buildLeaveBalance(state.leaveRequests, state.currentEmpId),
    };
  }, [state]);

  // MARK_ALL_READ needs the current notification ids.
  const wrappedDispatch = useCallback(action => {
    if (action.type === 'MARK_ALL_READ' && !action.ids) {
      dispatch({ type: 'MARK_ALL_READ', ids: derivedState.notifications.map(n => n.id) });
      return;
    }
    dispatch(action);
  }, [derivedState.notifications]);

  return (
    <AppCtx.Provider value={{ state: derivedState, dispatch: wrappedDispatch, toast, startSession, logout, actions }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
