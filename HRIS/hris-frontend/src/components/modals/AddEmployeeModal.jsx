import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import EmployeeFormFields, { emptyEmployeeForm, toPayload } from './EmployeeForm.jsx';

export default function AddEmployeeModal() {
  const { state, dispatch, actions, toast } = useApp();
  const [form, setForm] = useState(emptyEmployeeForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Creates both the Django login (username = email) and the Employee row.
      const emp = await actions.createEmployee(toPayload(form, { includeEmptyPassword: true }));
      dispatch({ type: 'CLOSE_MODAL' });
      toast('success', 'Employee added', `${emp.name} can now log in with ${emp.email}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add employee"
      onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      footer={
        <>
          <button type="button" onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-surface text-ink-soft border border-border hover:bg-bg transition-colors">
            Cancel
          </button>
          <button form="form-add-employee" type="submit" disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Add employee'}
          </button>
        </>
      }
    >
      <form id="form-add-employee" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <EmployeeFormFields form={form} onChange={onChange} departments={state.departments} passwordRequired />
        {error && <div className="text-[11.5px] text-danger font-medium">{error}</div>}
      </form>
    </Modal>
  );
}
