import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_EMP_ID } from '../../lib/mockData.js';
import Avatar from '../../components/ui/Avatar.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Banner } from '../../components/ui/RuleBanner.jsx';

export default function EmpProfile() {
  const { state } = useApp();
  const emp = state.employees.find(e => e.id === CURRENT_EMP_ID);

  if (!emp) return null;

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
      {/* Profile card */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5 text-center">
        <Avatar name={emp.name} size="xl" style={{ margin: '0 auto 14px', background: '#EEF2FF', color: '#3730A3' }} />
        <div className="font-bold text-[16px]">{emp.name}</div>
        <div className="text-ink-soft text-[12.5px] mt-1">{emp.position}</div>
        <div className="mt-2">
          <Badge variant="green" dot>Active</Badge>
        </div>
        <div className="h-px bg-border my-4" />
        <div className="flex flex-col gap-2.5 text-[13px] text-left">
          <div className="flex items-center gap-2 text-ink-soft">
            <span>✉</span>
            <span>{emp.email}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-soft">
            <span>📞</span>
            <span>{emp.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-soft">
            <span>🏢</span>
            <span>{emp.dept}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-soft">
            <span>📅</span>
            <span>Joined {emp.join}</span>
          </div>
        </div>
      </div>

      {/* Employment info */}
      <div className="bg-surface border border-border rounded-[14px] shadow-sm p-5">
        <div className="font-sora font-bold text-[15px] mb-4">Employment information</div>
        <div className="grid grid-cols-2 gap-4 text-[13px] max-[720px]:grid-cols-1">
          {[
            ['Employee ID',       <span key="id" className="font-semibold font-mono">{emp.id}</span>],
            ['Department',        <span key="dept" className="font-semibold">{emp.dept}</span>],
            ['Position',          <span key="pos" className="font-semibold">{emp.position}</span>],
            ['Employment status', <Badge key="status" variant="green" dot>Active</Badge>],
            ['Joining date',      <span key="join" className="font-semibold">{emp.join}</span>],
            ['Manager',           <span key="mgr" className="font-semibold">Sofia Martinez</span>],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-ink-mute text-[11.5px] mb-1">{label}</div>
              <div className="mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Banner>
            Profile edits (name, contact details) are managed by HR. Contact your administrator to request a change.
          </Banner>
        </div>
      </div>
    </div>
  );
}
