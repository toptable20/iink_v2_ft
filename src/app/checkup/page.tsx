import Link from 'next/link';
import { CheckupLookup } from './checkup';

export default function CheckupPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-10 text-zinc-900">
      <Link href="/" className="text-sm font-semibold tracking-[.2em] text-slate-700 hover:text-slate-950">
        TOPTABLE
      </Link>
      <CheckupLookup />
    </main>
  );
}
