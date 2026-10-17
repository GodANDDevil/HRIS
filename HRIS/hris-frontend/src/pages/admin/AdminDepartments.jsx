import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { RuleBanner } from '../../components/ui/RuleBanner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Avatar from '../../components/ui/Avatar.jsx';

const inputCls = 'border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] bg-surface text-ink w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-50';
const thCls = 'text-left text-[11px] uppercase tracking-[.04em] text-ink-mute px-3.5 py-2.5 border-b border-border whitespace-nowrap font-semibold';
const tdCls = 'px-3.5 py-3 border-b border-border-soft align-middle';
const btnGhost = 'px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold bg-surface border border-border text-ink-soft hover:bg-bg transition-colors';

function DepartmentModal({ dept, onClose }) {
  const { state, actions, toast } = useApp();
  const isEdit = Boolean(dept);
  const [form, setForm] = useState({
    name: dept?.name || '',
    description: dept?.description || '',
    department_head: dept?.department_head ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Only employees with the Department Head role can head a department.
  const heads = state.employees.filter(e => e.role === 'HEAD' && e.status === 'Active');

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      department_head: form.department_head ? Number(form.department_head) : null,
    };
    try {
      if (isEdit) await actions.updateDepartment(dept.id, payload);
      else await actions.createDepartment(payload);
      toast('success', isEdit ? 'Department updated' : 'Department added', `${payload.name} has been saved.`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit department' : 'Add department'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-surface text-ink-soft border border-border hover:bg-bg transition-colors">
            Cancel
          </button>
          <button form="form-department" type="submit" disabled={saving}
            className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add department'}
          </button>
        </>
      }
    >
      <form id="form-department" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Department name</label>
          <input className={inputCls} name="name" value={form.name} onChange={onChange} maxLength={100} placeholder="Engineering" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Description <span className="text-ink-mute font-normal">(optional)</span></label>
          <textarea className={`${inputCls} resize-y min-h-[70px]`} name="description" value={form.description} onChange={onChange} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-ink-soft">Department head <span className="text-ink-mute font-normal">(optional)</span></label>
          <select className={inputCls} name="department_head" value={form.department_head} onChange={onChange}>
            <option value="">— None —</option>
            {heads.map(h => <option key={h.id} value={h.pk}>{h.name}{h.dept ? ` · ${h.dept}` : ''}</option>)}
          </select>
          <div className="text-[11.5px] text-ink-mute">Only employees with the Department Head role are listed.</div>
        </div>
        {error && <div className="text-[11.5px] text-danger font-medium">{error}</div>}
      </form>
    </Modal>
  );
}

export default function AdminDepartments() {
  const { state, actions, toast } = useApp();
  const [editing, setEditing] = useState(null); // null | 'new' | department object
  const canManage = state.isHRHead;

  async function remove(dept) {
    if (!window.confirm(`Delete the "${dept.name}" department?`)) return;
    try {
      await actions.deleteDepartment(dept.id);
      toast('info', 'Department deleted', `${dept.name} has been removed.`);
    } catch (err) {
      toast('error', 'Could not delete', err.message);
    }
  }

  return (
    <div>
      <RuleBanner>
        {canManage
          ? 'As HR Department Head you can add, edit and delete departments. A department must be empty before it can be deleted.'
          : 'Only the HR Department Head can add or change departments. You have view-only access.'}
      </RuleBanner>

      <div className="bg-surface border border-border rounded-[14px] shadow-sm mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-[12.5px] text-ink-mute">{state.departments.length} departments</div>
          {canManage && (
            <button onClick={() => setEditing('new')}
              className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-600 active:scale-[.98] transition-all">
              + Add Department
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Department', 'Description', 'Head', 'Members', ...(canManage ? ['Actions'] : [])].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {state.departments.length > 0 ? state.departments.map(d => (
                <tr key={d.id} className="hover:bg-[#FAFBFD]">
                  <td className={`${tdCls} font-semibold`}>{d.name}</td>
                  <td className={`${tdCls} text-ink-soft`}>{d.description || '—'}</td>
                  <td className={tdCls}>
                    {d.department_head_name ? (
                      <div className="flex items-center gap-2"><Avatar name={d.department_head_name} /> {d.department_head_name}</div>
                    ) : <span className="text-ink-mute">—</span>}
                  </td>
                  <td className={`${tdCls} font-mono`}>{d.employees?.length ?? 0}</td>
                  {canManage && (
                    <td className={tdCls}>
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(d)} className={btnGhost}>Edit</button>
                        <button onClick={() => remove(d)} className={btnGhost}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canManage ? 5 : 4} className="text-center py-8 text-ink-mute">No departments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <DepartmentModal
          key={editing === 'new' ? 'new' : editing.id}
          dept={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
