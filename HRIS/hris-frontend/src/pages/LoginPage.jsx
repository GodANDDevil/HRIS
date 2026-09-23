import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('employee');
  const [form, setForm] = useState({ username: '', password: '', remember: true });

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    login(tab);
    navigate(tab === 'admin' ? '/admin' : '/employee');
  }

  const inputCls = 'border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 text-[13.5px] bg-white text-[#0F172A] w-full focus:outline-none focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#EEF2FF]';

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex-1 hidden md:flex flex-col justify-between px-12 py-12 relative overflow-hidden login-aside"
        style={{ background: 'linear-gradient(160deg, #3730A3, #4F46E5 60%, #6D63F0)' }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white font-bold font-sora text-[15px]"
            style={{ background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(4px)' }}>
            CH
          </div>
          <div>
            <div className="font-sora font-bold text-[18px] text-white">Chronos</div>
            <div className="text-[11.5px] text-white/80">Attendance &amp; Leave Platform</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ maxWidth: '420px' }}>
          <div className="font-mono text-[13px] text-white/75 uppercase tracking-[.06em] mb-2.5">
            Self-service, by design
          </div>
          <h1 className="text-[34px] font-bold leading-[1.25] text-white">
            Employees own their time. HR owns the oversight.
          </h1>
          <p className="mt-4 text-[14.5px] text-white/88 leading-[1.7]">
            Every check-in, check-out, and leave request is registered by the employee themselves — timestamped automatically, never edited by hand.
          </p>
          <div className="flex flex-col gap-3 mt-6">
            {[
              'Employees check in and out on their own device',
              'Leave requests originate only from the employee',
              'Admin/HR reviews, approves, and reports — nothing more',
            ].map(t => (
              <div key={t} className="flex items-center gap-2.5 text-[13.5px] text-white">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white/90"
                  style={{ background: 'rgba(255,255,255,.18)' }}>✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11.5px] text-white/65">© 2026 Chronos Corp. All timestamps are system-generated.</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-10 py-10 bg-white">
        <div className="w-full max-w-[380px]">
          <div className="mb-5">
            <h2 className="font-sora font-bold text-[23px]">Welcome back</h2>
            <p className="text-[12.5px] text-[#475569] mt-1.5">Sign in to continue to your workspace.</p>
          </div>

          {/* Role toggle */}
          <div className="flex bg-[#F5F7FB] rounded-[12px] p-1 gap-1 mb-6">
            {['employee', 'admin'].map(r => (
              <button key={r} type="button"
                onClick={() => setTab(r)}
                className={`flex-1 py-2.5 rounded-[9px] border-none text-[13px] font-semibold transition-all ${
                  tab === r
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'bg-transparent text-[#475569]'
                }`}>
                {r === 'employee' ? 'Employee' : 'Admin / HR'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-[#475569]">
                {tab === 'employee' ? 'Email or Employee ID' : 'Admin email'}
              </label>
              <input className={inputCls} name="username" value={form.username} onChange={onChange}
                placeholder={tab === 'employee' ? 'aarav.shah@chronoscorp.com' : 'sofia.martinez@chronoscorp.com'} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-[#475569]">Password</label>
              <input className={inputCls} type="password" name="password" value={form.password} onChange={onChange}
                placeholder="••••••••" />
            </div>
            {tab === 'admin' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[#475569]">Two-factor code <span className="text-[#94A3B8] font-normal">(optional)</span></label>
                <input className={inputCls} placeholder="6-digit code" />
              </div>
            )}
            <div className="flex items-center justify-between text-[12.5px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="remember" checked={form.remember} onChange={onChange}
                  style={{ accentColor: '#4F46E5' }} />
                Remember me
              </label>
              <a href="#" className="font-semibold text-[#4F46E5]">Forgot password?</a>
            </div>
            <button type="submit"
              className="w-full py-4 px-6 rounded-[12px] bg-[#4F46E5] text-white font-semibold text-[15px] hover:bg-[#4338CA] active:scale-[.98] transition-all mt-2">
              {tab === 'employee' ? 'Sign in to Employee Portal' : 'Sign in to Admin Portal'}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 px-4 py-3.5 rounded-[12px] text-[12.5px] bg-[#EEF2FF] border border-[#E0E7FF] text-[#3730A3] leading-[1.5]">
            {tab === 'employee'
              ? 'As an employee, you register your own attendance and leave — HR cannot do this for you.'
              : 'As Admin/HR you monitor attendance and process leave — you cannot check in, check out, or file leave for employees.'}
          </div>
        </div>
      </div>
    </div>
  );
}
