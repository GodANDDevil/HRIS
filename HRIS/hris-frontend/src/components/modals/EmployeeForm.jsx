// Shared fields for the Add / Edit employee modals.
// Field names match HRIS_APPS.serializers.EmployeeSerializer.

export const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-semibold text-ink-soft">{label}</label>
      {children}
    </div>
  );
}

export function emptyEmployeeForm() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    first_name: '', last_name: '', email: '', phone: '',
    role: 'STAFF', department: '', hire_date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    password: '',
  };
}

export function toPayload(form, { includeEmptyPassword = false } = {}) {
  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    role: form.role,
    hire_date: form.hire_date,
    department: form.department ? Number(form.department) : null,
  };
  if (form.password || includeEmptyPassword) payload.password = form.password;
  return payload;
}

export default function EmployeeFormFields({ form, onChange, departments, passwordRequired }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="First name">
          <input className={inputCls} name="first_name" value={form.first_name} onChange={onChange} required />
        </Field>
        <Field label="Last name">
          <input className={inputCls} name="last_name" value={form.last_name} onChange={onChange} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Department">
          <select className={inputCls} name="department" value={form.department} onChange={onChange}>
            <option value="">— No department —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Role">
          <select className={inputCls} name="role" value={form.role} onChange={onChange}>
            <option value="STAFF">Staff</option>
            <option value="HEAD">Department Head</option>
          </select>
        </Field>
      </div>
      <Field label="Email (used to log in)">
        <input className={inputCls} type="email" name="email" value={form.email} onChange={onChange} required />
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Phone">
          <input className={inputCls} name="phone" value={form.phone} onChange={onChange} placeholder="+977 98-0000-0000" maxLength={15} />
        </Field>
        <Field label="Hire date">
          <input className={inputCls} type="date" name="hire_date" value={form.hire_date} onChange={onChange} required />
        </Field>
      </div>
      <Field label={passwordRequired ? 'Password (min 8 characters)' : 'New password (leave blank to keep)'}>
        <input className={inputCls} type="password" name="password" value={form.password} onChange={onChange}
          minLength={8} required={passwordRequired} autoComplete="new-password" />
      </Field>
    </>
  );
}
