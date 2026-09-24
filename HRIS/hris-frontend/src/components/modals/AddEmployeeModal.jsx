import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import { DEPTS } from '../../lib/mockData.js';

export default function AddEmployeeModal() {
  const { dispatch, toast } = useApp();
  const [form, setForm] = useState({ name: '', dept: 'Engineering', position: '', email: '', phone: '' });
  const [error, setError] = useState('');

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.position || !form.email) {
      setError('Name, position and email are required.');
      return;
    }
    const emp = {
      id: 'EMP-' + (1050 + Math.floor(Math.random() * 900)),
      name: form.name,
      dept: form.dept,
      position: form.position,
      email: form.email,
      phone: form.phone,
      join: new Date().toISOString().slice(0, 10),
      status: 'Active',
    };
    dispatch({ type: 'ADD_EMPLOYEE', emp });
    dispatch({ type: 'CLOSE_MODAL' });
    toast('success', 'Employee added', `${emp.name} has been added to the directory.`);
  }

  const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';

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
          <button form="form-add-employee" type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 transition-colors">
            Add employee
          </button>
        </>
      }
    >
      <form id="form-add-employee" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Full name</label>
          <input className={inputCls} name="name" value={form.name} onChange={onChange} placeholder="Jordan Lee" required />
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
            <input className={inputCls} name="position" value={form.position} onChange={onChange} placeholder="Software Engineer" required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Email</label>
          <input className={inputCls} type="email" name="email" value={form.email} onChange={onChange} placeholder="jordan.lee@chronoscorp.com" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Phone</label>
          <input className={inputCls} name="phone" value={form.phone} onChange={onChange} placeholder="+977 98-0000-0000" />
        </div>
        {error && <div className="text-[11.5px] text-danger font-medium">{error}</div>}
      </form>
    </Modal>
  );
}
