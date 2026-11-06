'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth';
import { createMyHealthReport, getMyHealthReports, type HealthReport } from '@/lib/health-report';
import { getMyQuizReports, type SavedReport } from '@/lib/quiz-session';
import { isCurrentReport, LEVEL_LABEL, ReportView } from '../report-view';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' });
const SOURCE_SHORT = { QUIZ: 'Quiz', NHIS: 'Checkup', WATCH: 'Watch' } as const;

// The logged-in member's saved results, newest first. Combined results (quiz + NHIS + watch) when
// there are any; otherwise the older quiz-only results. Tap one to open it.
// Results from before algorithm 2.0.0 are hidden.
export function MyResults() {
  const router = useRouter();
  const session = useSession();
  const [reports, setReports] = useState<(HealthReport | SavedReport)[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<HealthReport | SavedReport | null>(null);
  const memberId = session?.member._id;

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    getMyHealthReports()
      .then(async ({ list }) => {
        const current = list.filter(isCurrentReport);
        return current.length ? current : (await getMyQuizReports()).list.filter(isCurrentReport);
      })
      .then((list) => !cancelled && setReports(list))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // A new combined result from the latest quiz, e.g. after connecting NHIS or a watch.
  async function createNew() {
    setCreating(true);
    setError(null);
    try {
      const report = await createMyHealthReport();
      setReports((prev) => [report, ...(prev ?? []).filter((r) => 'sources' in r)]);
      setOpen(report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (open) return <ReportView report={open} onRestart={() => router.push('/quiz')} />;

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-[#f8f7f2] px-5 py-10 font-sans text-[#3b3b3b]">
      <Link href="/" className="mb-8">
        <Image src="/iink-logo.svg" alt="iink home" width={97} height={30} className="h-[28px] w-auto" />
      </Link>
      <div className="w-full max-w-[560px]">
        <h1 className="text-[26px] font-semibold tracking-[-.02em]">My results</h1>
        <p className="mt-1 text-sm text-[#85847e]">Your saved results, newest first.</p>

        <div className="mt-6 flex flex-col gap-3">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}
          {!session ? (
            <Notice>
              Log in to see your saved results.{' '}
              <Link href="/login" className="font-semibold underline-offset-4 hover:underline">Log in</Link>
            </Notice>
          ) : reports === null ? (
            !error && <Notice>Loading…</Notice>
          ) : reports.length === 0 ? (
            <Notice>
              No saved results yet.{' '}
              <Link href="/quiz" className="font-semibold underline-offset-4 hover:underline">Start the quiz</Link>
            </Notice>
          ) : (
            reports.map((report) => {
              const top = [...report.topics.topics].sort((a, b) => (b.diagramLevel ?? 0) - (a.diagramLevel ?? 0))[0];
              const used = 'sources' in report ? report.sources.filter((s) => s.status === 'USED').map((s) => SOURCE_SHORT[s.source]) : ['Quiz'];
              return (
                <button
                  key={report._id}
                  type="button"
                  onClick={() => setOpen(report)}
                  className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[#e9e7df] bg-[#fbfaf7] px-5 py-4 text-left transition-colors hover:bg-white"
                >
                  <span>
                    <span className="block text-sm text-[#85847e]">{dateFormat.format(new Date(report.createdAt))}</span>
                    {top?.level && (
                      <span className="mt-1 block font-semibold">
                        {top.label} <span className="font-normal text-[#55aa7a]">· {LEVEL_LABEL[top.level]}</span>
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-[#85847e]">
                      Based on: {used.join(' · ')}
                      {'preview' in report && report.preview && <span className="ml-2 font-semibold text-[#b07d16]">PREVIEW (fake data)</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[#55aa7a]">Open →</span>
                </button>
              );
            })
          )}
        </div>

        {session && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={createNew}
              disabled={creating}
              className="flex min-h-[56px] w-full items-center justify-center rounded-[20px] border border-[#a9dfbd] bg-white px-5 text-[16px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#eef8f1] disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Make a new result with my latest data'}
            </button>
            <p className="-mt-1 text-center text-xs text-[#85847e]">Re-analyses your last quiz together with any checkup or watch data you have connected.</p>
            <Link
              href="/quiz"
              className="flex min-h-[56px] w-full items-center justify-center rounded-[20px] bg-[#a9dfbd] px-5 text-[16px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa]"
            >
              Take the quiz
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[20px] border border-[#e9e7df] bg-white px-5 py-4 text-sm text-[#5f5e58]">{children}</p>;
}
