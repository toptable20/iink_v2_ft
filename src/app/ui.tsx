export const primaryButton =
  'rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-40';

export function Card({ children, className = 'max-w-xl bg-white' }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-full rounded-3xl p-6 shadow-sm sm:p-10 ${className}`}>{children}</div>;
}
