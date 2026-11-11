'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/auth';
import {
  getMySmartQuizResults,
  getSmartQuizResult,
  type SmartQuizResult,
} from '@/lib/smart-quiz';
import { koreanError } from '@/lib/alerts';
import { updateResultWithAlert, usedDataLabel, usedDataText } from '@/lib/update-alert';
import { ReportView } from '../report-view';

// An update makes a new result from the same quiz attempt; the list shows only the newest one per attempt
// (the older ones stay saved for the "달라진 점" comparison and orders). A new quiz attempt gets its own line.
function newestPerQuiz(list: SmartQuizResult[]): SmartQuizResult[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    if (seen.has(r.sessionId)) return false;
    seen.add(r.sessionId);
    return true;
  });
}

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' });

// The logged-in member's saved V9 results, newest first. Tap one to open it.
// `?id=` opens one result (from the list, or right after finishing the quiz with `&saved=1`). Opening one from the
// list adds a history step, so the browser back button and the report's X both return to this list.
export function MyResults() {
  const router = useRouter();
  const session = useSession();
  const params = useSearchParams();
  const openId = params.get('id');
  const justSaved = params.get('saved') === '1';
  // true when the open report was opened from this list (then X = browser back)
  const fromList = useRef(false);
  const [reports, setReports] = useState<SmartQuizResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatedNotice, setUpdatedNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<SmartQuizResult | null>(null);
  // the result made just before the open one, for the "달라진 점" marks
  const [previous, setPrevious] = useState<{ forId: string; result: SmartQuizResult } | null>(null);
  const memberId = session?.member._id;

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    getMySmartQuizResults()
      .then(({ list }) => !cancelled && setReports(newestPerQuiz(list)))
      .catch((e: Error) => !cancelled && setError(koreanError(e.message)));
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  useEffect(() => {
    if (!memberId || !openId || String(open?._id) === openId) return;
    let cancelled = false;
    getSmartQuizResult(openId)
      .then((r) => !cancelled && setOpen(r))
      .catch((e: Error) => !cancelled && setError(koreanError(e.message)));
    return () => {
      cancelled = true;
    };
  }, [memberId, openId, open]);

  useEffect(() => {
    const prevId = open?.previousResultId;
    if (!memberId || !open || !prevId || previous?.forId === String(open._id)) return;
    let cancelled = false;
    getSmartQuizResult(String(prevId))
      .then((r) => !cancelled && setPrevious({ forId: String(open._id), result: r }))
      .catch(() => {}); // without it the report simply shows no comparison
    return () => {
      cancelled = true;
    };
  }, [memberId, open, previous]);

  // A new result from the latest quiz, e.g. after connecting a checkup or a watch.
  async function createNew() {
    setCreating(true);
    setError(null);
    // loading pop-up while it runs, then a success / error pop-up
    const report = await updateResultWithAlert();
    if (report) {
      // the new result is the latest one; every older one becomes history
      setReports((prev) => newestPerQuiz([report, ...(prev ?? []).map((r) => ({ ...r, isLatest: false }))]));
      setOpen(report);
      router.replace(`/results?id=${report._id}`);
      setUpdatedNotice(`결과를 업데이트했어요. ${usedDataText(report.usedSources)}`);
    }
    setCreating(false);
  }

  function closeReport() {
    if (fromList.current) router.back();
    else router.replace('/results');
    fromList.current = false;
  }

  if (open && openId && String(open._id) === openId)
    return (
      <ReportView
        report={open}
        saved={justSaved}
        onClose={closeReport}
        onRestart={() => router.push('/quiz')}
        onUpdate={createNew}
        updating={creating}
        updatedNotice={updatedNotice}
        previous={previous?.forId === String(open._id) ? previous.result : null}
      />
    );

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-[#f8f7f2] px-5 py-12 font-sans text-[#3b3b3b] sm:px-8 sm:py-16">
      <Link href="/" className="mb-10 sm:mb-12">
        <Image src="/iink-logo.svg" alt="iink 홈" width={118} height={36} className="h-[34px] w-auto" />
      </Link>
      <div className="w-full max-w-[760px]">
        <h1 className="text-[30px] font-semibold tracking-[-.025em] sm:text-[36px]">내 결과</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#85847e] sm:text-base">저장된 결과를 최신순으로 보여드립니다. 결과를 업데이트하면 이전 결과 대신 새 결과가 표시되고, 달라진 점은 결과 안에서 확인할 수 있어요.</p>

        <div className="mt-8 flex flex-col gap-4">
          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[15px] leading-relaxed text-rose-700">{error}</div>
          )}
          {!session ? (
            <Notice>
              저장된 결과를 보려면 로그인해 주세요.{' '}
              <Link href="/login" className="font-semibold underline-offset-4 hover:underline">로그인</Link>
            </Notice>
          ) : reports === null ? (
            !error && <Notice>불러오는 중…</Notice>
          ) : reports.length === 0 ? (
            <Notice>
              저장된 결과가 없습니다.{' '}
              <Link href="/quiz" className="font-semibold underline-offset-4 hover:underline">퀴즈 시작하기</Link>
            </Notice>
          ) : (
            reports.map((report) => (
              <button
                key={report._id}
                type="button"
                onClick={() => {
                  setUpdatedNotice(null);
                  setOpen(report);
                  fromList.current = true;
                  router.push(`/results?id=${report._id}`);
                }}
                className="flex min-h-[104px] w-full items-center justify-between gap-5 rounded-[24px] border border-[#e9e7df] bg-[#fbfaf7] px-6 py-5 text-left transition-colors hover:bg-white hover:shadow-sm sm:px-7"
              >
                <span>
                  <span className="block text-sm text-[#85847e] sm:text-[15px]">{dateFormat.format(new Date(report.createdAt))}</span>
                  <span className="mt-2 block text-[16px] font-semibold sm:text-lg">
                    {usedDataLabel(report.usedSources)}
                    {report.isLatest && <span className="ml-2 rounded-full bg-[#dceee6] px-2 py-0.5 text-xs font-semibold text-[#3d7a55]">최신</span>}
                  </span>
                  <span className="mt-1 block text-sm text-[#5f5e58]">{report.result.status}</span>
                  {report.changesFromPrevious.length > 0 && (
                    <span className="mt-1 block text-sm text-[#5f5e58]">
                      이전 결과 대비: {report.changesFromPrevious.map((c) => `${c.topic} ${c.from} → ${c.to}`).join(', ')}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[15px] font-semibold text-[#55aa7a] sm:text-base">열기 →</span>
              </button>
            ))
          )}
        </div>

        {session && (
          <div className="mt-8 flex flex-col gap-4">
            {/* New results with checkup / watch data are made from the 결과 업데이트 button inside the latest report. */}
            <Link
              href="/quiz"
              className="flex min-h-[64px] w-full items-center justify-center rounded-[20px] bg-[#a9dfbd] px-5 text-[16px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa] sm:text-[17px]"
            >
              퀴즈 하기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-[88px] items-center rounded-[22px] border border-[#e9e7df] bg-white px-6 py-5 text-[15px] leading-relaxed text-[#5f5e58] sm:text-base">{children}</p>;
}
