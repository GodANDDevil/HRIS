const API_BASE = '/api';
const ACCESS_KEY = 'hris_access_token';
const REFRESH_KEY = 'hris_refresh_token';

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function flattenError(data) {
  if (!data || typeof data !== 'object') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (data.error) return typeof data.error === 'string' ? data.error : flattenError(data.error);
  return Object.entries(data)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(', ') : (typeof value === 'object' ? flattenError(value) : value);
      return key === 'non_field_errors' || key === '__all__' ? text : `${key}: ${text}`;
    })
    .join(' | ');
}

/* ─── token refresh (SimpleJWT access tokens expire) ─── */
let refreshing = null;

async function refreshAccessToken() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async res => {
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem(ACCESS_KEY, data.access);
        if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export function hasStoredSession() {
  return Boolean(localStorage.getItem(ACCESS_KEY));
}

export async function apiRequest(path, options = {}, retry = true) {
  const token = localStorage.getItem(ACCESS_KEY);
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers,
      // JWT is sent in the header; omitting cookies avoids Django's CSRF check
      // kicking in when a django-admin session cookie exists for localhost.
      credentials: 'omit',
    });
  } catch {
    throw new ApiError('Cannot connect to the server. Is Django running on port 8000?', 0);
  }

  if (response.status === 401 && retry && await refreshAccessToken()) {
    return apiRequest(path, options, false);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const detail = typeof data === 'object' ? flattenError(data) : '';
    throw new ApiError(detail || `API request failed (${response.status})`, response.status, data);
  }
  return data;
}

export async function loginWithApi(username, password) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ username: username.trim(), password }),
    });
  } catch {
    throw new ApiError('Cannot connect to the server.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.detail || 'Invalid email/username or password.', response.status, data);
  }
  if (!data.access) {
    throw new ApiError('Login response did not contain an access token.');
  }

  localStorage.setItem(ACCESS_KEY, data.access);
  if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
  return data;
}

export function clearApiSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

const json = (method, payload) => ({ method, body: JSON.stringify(payload ?? {}) });

export const api = {
  health: () => apiRequest('/health/'),
  me: () => apiRequest('/me/'),
  employees: () => apiRequest('/employees/'),
  createEmployee: payload => apiRequest('/employees/', json('POST', payload)),
  updateEmployee: (id, payload) => apiRequest(`/employees/${id}/`, json('PATCH', payload)),
  departments: () => apiRequest('/departments/'),
  createDepartment: payload => apiRequest('/departments/', json('POST', payload)),
  updateDepartment: (id, payload) => apiRequest(`/departments/${id}/`, json('PATCH', payload)),
  deleteDepartment: id => apiRequest(`/departments/${id}/`, { method: 'DELETE' }),
  attendance: () => apiRequest('/attendance/'),
  checkIn: employeeId => apiRequest(`/attendance/check-in/${employeeId}/`, json('POST')),
  checkOut: employeeId => apiRequest(`/attendance/check-out/${employeeId}/`, json('POST')),
  leaves: () => apiRequest('/leaves/'),
  // FormData so the optional document file is actually uploaded.
  createLeave: formData => apiRequest('/leaves/', { method: 'POST', body: formData }),
  cancelLeave: id => apiRequest(`/leaves/${id}/`, { method: 'DELETE' }),
  reviewLeave: (id, status) => apiRequest(`/leaves/${id}/review/`, json('POST', { status })),
};

/* ─── normalizers: API shape → the shape the pages already use ───
   ids are converted to strings so existing comparisons such as
   e.id === useParams().empId and e.id.toLowerCase() keep working. */

export function localDateIso(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function normalizeEmployee(employee) {
  return {
    ...employee,
    pk: employee.id,
    id: String(employee.id),
    name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
    dept: employee.department_name || '',
    deptId: employee.department ?? null,
    position: employee.role === 'HEAD' ? 'Department Head' : 'Staff',
    join: employee.hire_date || '',
    phone: employee.phone || '',
    status: employee.is_active ? 'Active' : 'Inactive',
  };
}

const ATTENDANCE_LABELS = {
  PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late',
  EARLY_DEPARTURE: 'Early Departure', CHECKED_IN: 'Checked In', ON_LEAVE: 'On Leave',
};

export function normalizeAttendance(record) {
  return {
    ...record,
    id: String(record.id),
    empId: String(record.employee),
    empName: record.employee_name,
    checkIn: record.check_in,
    checkOut: record.check_out,
    status: ATTENDANCE_LABELS[record.status] || record.status,
  };
}

const LEAVE_LABELS = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };

export function normalizeLeave(leave) {
  const fileName = leave.document ? decodeURIComponent(String(leave.document).split('/').pop()) : null;
  return {
    ...leave,
    pk: leave.id,
    id: String(leave.id),
    empId: String(leave.employee),
    // employee.__str__ is "First Last (ROLE)" – drop the role suffix for display
    empName: (leave.employee_name || '').replace(/\s*\((STAFF|HEAD)\)$/, ''),
    type: (leave.leave_type || '').toLowerCase(),
    start: leave.start_date,
    end: leave.end_date,
    days: leave.total_days,
    submitted: leave.created_at ? localDateIso(new Date(leave.created_at)) : '',
    status: LEAVE_LABELS[leave.status] || leave.status,
    attachment: fileName,
    attachmentUrl: leave.document || null,
  };
}

/* DRF returns a plain list unless pagination is enabled; support both. */
export function listOf(data) {
  return Array.isArray(data) ? data : (data?.results ?? []);
}
