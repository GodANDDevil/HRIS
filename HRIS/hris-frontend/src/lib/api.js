const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('hris_access_token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const detail = data && typeof data === 'object'
      ? data.detail || data.error || Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' | ')
      : data;
    throw new ApiError(detail || `API request failed (${response.status})`, response.status, data);
  }
  return data;
}

// The current Django project does not yet define this route. This function is
// ready to use if a JWT login endpoint is added later; it does not simulate login.
export async function loginWithApi(username, password) {
  const data = await apiRequest('/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!data?.access) throw new ApiError('The login response did not include an access token.');
  localStorage.setItem('hris_access_token', data.access);
  if (data.refresh) localStorage.setItem('hris_refresh_token', data.refresh);
  return data;
}

export function clearApiSession() {
  localStorage.removeItem('hris_access_token');
  localStorage.removeItem('hris_refresh_token');
}

export const api = {
  health: () => apiRequest('/health/'),
  employees: () => apiRequest('/employees/'),
  createEmployee: payload => apiRequest('/employees/', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) => apiRequest(`/employees/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  departments: () => apiRequest('/departments/'),
  createDepartment: payload => apiRequest('/departments/', { method: 'POST', body: JSON.stringify(payload) }),
  attendance: () => apiRequest('/attendance/'),
  checkIn: employeeId => apiRequest(`/attendance/check-in/${employeeId}/`, { method: 'POST', body: JSON.stringify({}) }),
  checkOut: employeeId => apiRequest(`/attendance/check-out/${employeeId}/`, { method: 'POST', body: JSON.stringify({}) }),
  leaves: () => apiRequest('/leaves/'),
  createLeave: payload => apiRequest('/leaves/', { method: 'POST', body: JSON.stringify(payload) }),
  reviewLeave: (id, status) => apiRequest(`/leaves/${id}/review/`, { method: 'POST', body: JSON.stringify({ status }) }),
};

export function normalizeEmployee(employee) {
  return {
    ...employee,
    id: employee.id,
    name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
    dept: employee.department_name || '',
    position: employee.role === 'HEAD' ? 'Department Head' : 'Staff',
    status: employee.is_active ? 'Active' : 'Inactive',
  };
}

export function normalizeAttendance(record) {
  const statusLabels = {
    PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late',
    EARLY_DEPARTURE: 'Early Departure', CHECKED_IN: 'Checked In', ON_LEAVE: 'On Leave',
  };
  return {
    ...record,
    empId: record.employee,
    empName: record.employee_name,
    checkIn: record.check_in,
    checkOut: record.check_out,
    status: statusLabels[record.status] || record.status,
  };
}

export function normalizeLeave(leave) {
  const statusLabels = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
  return {
    ...leave,
    empId: leave.employee,
    empName: leave.employee_name,
    type: (leave.leave_type || '').toLowerCase(),
    start: leave.start_date,
    end: leave.end_date,
    days: leave.total_days,
    submitted: leave.created_at ? leave.created_at.slice(0, 10) : '',
    status: statusLabels[leave.status] || leave.status,
  };
}
