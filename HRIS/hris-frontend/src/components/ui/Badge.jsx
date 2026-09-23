/* Badge — mirrors .badge-green, badge-amber, badge-red, badge-gray, badge-blue */
const VARIANTS = {
  green: 'bg-success-100 text-success-700',
  amber: 'bg-warning-100 text-warning-700',
  red:   'bg-danger-100 text-danger-700',
  blue:  'bg-primary-100 text-primary-700',
  gray:  'bg-[#F1F5F9] text-ink-soft',
};

const DOT_COLORS = {
  green: '#16A34A',
  amber: '#D97706',
  red:   '#DC2626',
  blue:  '#4F46E5',
  gray:  '#94A3B8',
};

export default function Badge({ variant = 'gray', dot = false, children }) {
  return (
    <span className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11.5px] font-semibold whitespace-nowrap ${VARIANTS[variant] || VARIANTS.gray}`}>
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: DOT_COLORS[variant] || DOT_COLORS.gray }}
        />
      )}
      {children}
    </span>
  );
}

/* Helper: map status string to badge variant */
export function statusVariant(status) {
  if (!status) return 'gray';
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'present' || s === 'active' || s === 'checked in') return 'green';
  if (s === 'pending' || s === 'late') return 'amber';
  if (s === 'rejected' || s === 'absent' || s === 'inactive') return 'red';
  if (s === 'early departure') return 'amber';
  return 'gray';
}
