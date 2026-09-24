/* Modal — mirrors .modal-overlay / .modal */
export default function Modal({ title, onClose, footer, children }) {
  return (
    <div className="fixed inset-0 bg-[rgba(15,23,42,.5)] flex items-center justify-center z-[150] p-5 backdrop-blur-sm">
      <div className="bg-surface rounded-[20px] w-full max-w-[520px] max-h-[88vh] overflow-y-auto shadow-lg animate-pop">
        {/* Head */}
        <div className="flex items-center justify-between px-[22px] py-[18px] border-b border-border">
          <div className="font-sora font-bold text-[15px]">{title}</div>
          <button
            onClick={onClose}
            className="w-[38px] h-[38px] rounded-[10px] border border-border bg-surface flex items-center justify-center text-ink-soft hover:bg-bg transition-colors"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="px-[22px] py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-[22px] py-4 border-t border-border flex justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
