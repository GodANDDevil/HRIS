import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import { DEPTS } from '../../lib/mockData.js';

export default function EditEmployeeModal() {
  const { state, dispatch, toast } = useApp();
  const emp = state.employees.find(e => e.id === state.editEmpId);
  const [form, setForm] = useState({ name: '', dept: 'Engineering', position: '', email: '', phone: '' });

  useEffect(() => {
    if (emp) setForm({ name: emp.name, dept: emp.dept, position: emp.position, email: emp.email, phone: emp.phone || '' });
  }, [emp]);

  if (!emp) return null;

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  function handleSubmit(e) {
    e.preventDefault();
    dispatch({ type: 'EDIT_EMPLOYEE', emp: { ...emp, ...form } });
    dispatch({ type: 'CLOSE_MODAL' });
    toast('success', 'Profile updated', `${form.name}'s information has been saved.`);
  }

  const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';

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
          <button form="form-edit-employee" type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 transition-colors">
            Save changes
          </button>
        </>
      }
    >
      <form id="form-edit-employee" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Full name</label>
          <input className={inputCls} name="name" value={form.name} onChange={onChange} required />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-ink-soft">Department</label>
            <select className={inputCls} name="dept" value={form.dept} onChange={onChange}>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-ink-soft">Position</label>
            <input className={inputCls} name="position" value={form.position} onChange={onChange} required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Email</label>
          <input className={inputCls} type="email" name="email" value={form.email} onChange={onChange} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Phone</label>
          <input className={inputCls} name="phone" value={form.phone} onChange={onChange} />
        </div>
        <div className="text-[11.5px] text-ink-mute">This form edits profile information only — attendance and leave records cannot be modified here.</div>
      </form>
    </Modal>
  );
}
