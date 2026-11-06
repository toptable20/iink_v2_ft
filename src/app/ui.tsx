export const primaryButton =
  'rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-40';

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-sm sm:p-10">{children}</div>;
}
