import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useNavigate } from 'react-router-dom';
import {
  loginWithApi,
  api,
  clearApiSession,
} from '../lib/api.js';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
    remember: true,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate using the existing Django JWT endpoint.
      await loginWithApi(form.username, form.password);

      // Check which existing workspace endpoint the account can access.
      // This is a frontend routing fallback, not definitive role detection.
      let role = 'employee';

      try {
        await api.employees();
        role = 'admin';
      } catch (apiError) {
        if (apiError.status === 401 || apiError.status === 403) {
          role = 'employee';
        } else {
          throw apiError;
        }
      }

      const enteredUsername = form.username.trim();

      const user = {
        name: enteredUsername.includes('@')
          ? enteredUsername.split('@')[0]
          : enteredUsername,
        email: enteredUsername.includes('@')
          ? enteredUsername
          : '',
        username: enteredUsername,
      };

      // Pass the user to the existing application context.
      login(role, user);

      navigate(role === 'admin' ? '/admin' : '/employee');
    
    } catch (err) {
      clearApiSession();

      if (err.status === 401) {
        setError('Invalid email/username or password.');
      } else if (err.status === 403) {
        setError('You do not have permission to access this workspace.');
      } else if (err.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (err.status === 404) {
        setError('Login service not found. Check your API configuration.');
      } else if (
        err.status === 0 ||
        err instanceof TypeError
      ) {
        setError('Cannot connect to the server. Please try again.');
      } else {
        setError('Login failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }

  }

  const inputCls =
    'border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 text-[13.5px] bg-white text-[#0F172A] w-full focus:outline-none focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#EEF2FF]';

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="flex-1 hidden md:flex flex-col justify-between px-12 py-12 relative overflow-hidden login-aside"
        style={{
          background:
            'linear-gradient(160deg, #3730A3, #4F46E5 60%, #6D63F0)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white font-bold font-sora text-[15px]"
            style={{
              background: 'rgba(255,255,255,.16)',
              backdropFilter: 'blur(4px)',
            }}
          >
            CH
          </div>

          <div>
            <div className="font-sora font-bold text-[18px] text-white">
              Chronos
            </div>
            <div className="text-[11.5px] text-white/80">
              Attendance &amp; Leave Platform
            </div>
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
            Every check-in, check-out, and leave request is registered
            through your workspace, with timestamps recorded automatically.
          </p>

          <div className="flex flex-col gap-3 mt-6">
            {[
              'Employees check in and out on their own device',
              'Leave requests originate from the employee',
              'HR reviews, approves, and reports',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 text-[13.5px] text-white"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white/90"
                  style={{ background: 'rgba(255,255,255,.18)' }}
                >
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11.5px] text-white/65">
          © 2026 Chronos Corp. All timestamps are system-generated.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 bg-white">
        <div className="w-full max-w-[380px]">
          <div className="mb-6">
            <h2 className="font-sora font-bold text-[23px]">
              Welcome back
            </h2>
            <p className="text-[12.5px] text-[#475569] mt-1.5">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Email or username */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-[12.5px] font-semibold text-[#475569]"
              >
                Email or username
              </label>

              <input
                id="username"
                className={inputCls}
                type="text"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Enter your email or username"
                autoComplete="username"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[12.5px] font-semibold text-[#475569]"
              >
                Password
              </label>

              <input
                id="password"
                className={inputCls}
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between text-[12.5px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={onChange}
                  style={{ accentColor: '#4F46E5' }}
                />
                Remember me
              </label>

              <span className="font-semibold text-[#94A3B8]">
                Forgot password?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-[12px] bg-[#4F46E5] text-white font-semibold text-[15px] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Information panel */}
          <div className="mt-6 flex items-start gap-3 px-4 py-3.5 rounded-[12px] text-[12.5px] bg-[#EEF2FF] border border-[#E0E7FF] text-[#3730A3] leading-[1.5]">
            Sign in with your registered account to access your workspace.
          </div>
        </div>
      </div>
    </div>
  );
}
