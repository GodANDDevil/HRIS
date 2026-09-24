/* RuleBanner — mirrors .rule-banner (yellow/warning) and .banner (blue/primary) */

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-px">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export function RuleBanner({ children }) {
  return (
    <div className="flex gap-2.5 items-start bg-warning-50 border border-warning-100 text-warning-700 px-3.5 py-3 rounded-[12px] text-[12px] leading-[1.5]">
      <ShieldIcon />
      <div>{children}</div>
    </div>
  );
}

export function Banner({ children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-[12px] text-[12.5px] leading-[1.5] bg-primary-50 border border-primary-100 text-primary-700">
      {children}
    </div>
  );
}
