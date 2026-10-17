import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import EmployeeFormFields, { toPayload } from './EmployeeForm.jsx';

function formFrom(emp) {
  return {
    first_name: emp.first_name || '',
    last_name: emp.last_name || '',
    email: emp.email || '',
    phone: emp.phone || '',
    role: emp.role || 'STAFF',
    department: emp.deptId ?? '',
    hire_date: emp.hire_date || '',
    password: '',
  };
}

export default function EditEmployeeModal() {
  const { state } = useApp();
  const emp = state.employees.find(e => e.id === state.editEmpId);
  if (!emp) return null;
  // key resets the form when a different employee is opened
  return <EditEmployeeForm key={emp.id} emp={emp} />;
}

function EditEmployeeForm({ emp }) {
  const { state, dispatch, actions, toast } = useApp();
  const [form, setForm] = useState(() => formFrom(emp));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await actions.updateEmployee(emp.pk, toPayload(form));
      dispatch({ type: 'CLOSE_MODAL' });
      toast('success', 'Profile updated', `${updated.name}'s information has been saved.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit employee profile"
      onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      footer={
        <>
          <button type="button" onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-surface text-ink-soft border border-border hover:bg-bg transition-colors">
            Cancel
          </button>
          <button form="form-edit-employee" type="submit" disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="form-edit-employee" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <EmployeeFormFields form={form} onChange={onChange} departments={state.departments} passwordRequired={false} />
        {error && <div className="text-[11.5px] text-danger font-medium">{error}</div>}
        <div className="text-[11.5px] text-ink-mute">This form edits profile information only — attendance and leave records cannot be modified here.</div>
      </form>
    </Modal>
  );
}
