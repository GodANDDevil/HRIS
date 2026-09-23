import { useApp } from '../../context/AppContext.jsx';

const TYPE_STYLES = {
  success: { icon: '✓', bg: 'bg-success' },
  error:   { icon: '✕', bg: 'bg-danger' },
  info:    { icon: 'i', bg: 'bg-primary' },
};

function ToastItem({ toast }) {
  const { dispatch } = useApp();
  const { icon, bg } = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  return (
    <div className="min-w-[280px] max-w-[360px] p-[13px_15px] rounded-[12px] shadow-lg flex gap-2.5 items-start bg-surface border border-border animate-slideIn">
      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold ${bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px]">{toast.title}</div>
        {toast.msg && <div className="text-[12px] text-ink-soft mt-0.5">{toast.msg}</div>}
      </div>
      <button
        onClick={() => dispatch({ type: 'REMOVE_TOAST', id: toast.id })}
        className="text-ink-mute hover:text-ink text-[12px] flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { state } = useApp();
  return (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2.5">
      {state.toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
