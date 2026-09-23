/* Chip — mirrors .chip / .chip.active */
export default function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-[10px] py-1 rounded-full border text-[12px] font-medium inline-flex items-center gap-[5px] cursor-pointer transition-colors ${
        active
          ? 'bg-primary-50 border-primary-200 text-primary-700'
          : 'bg-bg border-border text-ink-soft hover:border-primary-200'
      }`}
    >
      {children}
    </button>
  );
}
