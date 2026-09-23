import { getInitials } from '../../lib/mockData.js';

const SIZES = {
  sm: 'w-[30px] h-[30px] text-[12px]',
  lg: 'w-[56px] h-[56px] text-[19px]',
  xl: 'w-[78px] h-[78px] text-[26px]',
};

export default function Avatar({ name = '', size = 'sm', style }) {
  return (
    <div
      className={`rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold font-sora flex-shrink-0 ${SIZES[size] || SIZES.sm}`}
      style={style}
    >
      {getInitials(name)}
    </div>
  );
}
