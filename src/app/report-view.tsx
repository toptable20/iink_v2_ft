'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import Swal from 'sweetalert2';
import { GREEN, showError } from '@/lib/alerts';
import { downloadReportPdf } from '@/lib/report-pdf';
import { useSession } from '@/lib/auth';
import type { SmartQuizResult } from '@/lib/smart-quiz';
import { ConnectSheet, type ConnectKind } from './connect-sheet';
import { UpdateCheckRows, useUpdateCheck } from './update-check';
import { ChangeSummary, diffReports } from './report-compare';
import { ReportSheet } from './report-sheet';

const dayFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

// e.g. "2026-11-19_1532": the result's date and time in Korea, for the PDF file name
function pdfStamp(createdAt: string | Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(createdAt))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}`;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// onUpdate: make a NEW result from the latest quiz + the checkup/watch data connected for THIS quiz (this one is kept).
// The 데이터 추가 box checks what a new result would use (engine dry run on the backend): ✓ / ✕ per source,
// and the update button works only when a new result would add something.
// Connections belong to one quiz attempt: 검진 연결 / 워치 연결 here, then closing the sheet, connects that source
// for this quiz only. A new quiz starts with nothing connected, even when the account still has a linked app.
// updatedNotice: shown once after an update, e.g. "설문 + 워치 데이터를 반영해 결과를 업데이트했습니다."
// Only the latest result can add data, update and order; older results are history (the report body stays as saved).
export function ReportView({
  report,
  onRestart,
  onClose,
  saved = false,
  autoConnect = [],
  onUpdate,
  updating = false,
  updatedNotice,
  previous,
  guestBox,
}: {
  report: SmartQuizResult;
  onRestart: () => void;
  // X: back to the results list (without it, X goes home)
  onClose?: () => void;
  saved?: boolean;
  // STEP 0 choices of the quiz just finished: these connect sheets open one after the other over the new report
  autoConnect?: ConnectKind[];
  onUpdate?: () => void;
  updating?: boolean;
  updatedNotice?: string | null;
  // the result made just before this one: changed values are marked (green, bold, old value in grey)
  previous?: SmartQuizResult | null;
  guestBox?: ReactNode;
}) {
  const showData = Boolean(onUpdate && report.isLatest);
  // the STEP 0 sheets still to open after the current one (only on the member's latest result)
  const chosen = showData ? autoConnect : [];
  const [sheet, setSheet] = useState<ConnectKind | null>(chosen[0] ?? null);
  const [queue, setQueue] = useState<ConnectKind[]>(chosen.slice(1));
  const { check, loading: checking, reload, canUpdate } = useUpdateCheck(String(report._id), showData);

  // * The connect sheet closed. Closing alone connects nothing: the sheet's own "이 결과에 연결하기" button marks the
  //   source for THIS quiz (connected = true). Either way the check runs again: while the sheet was open the app may
  //   have synced or a new NHIS lookup may have finished, so the box and the button must follow the backend now.
  //   A STEP 0 choice still waiting opens next.
  function closeSheet() {
    setSheet(queue[0] ?? null);
    setQueue(queue.slice(1));
    reload();
  }
  // after an update the new result arrives with a new id, so the check runs again against it
  const session = useSession();
  const memberName = guestBox ? '게스트' : session?.member.memberNick.trim() || '';
  const asOf = dayFormat.format(new Date(report.createdAt));
  const pdfDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(report.createdAt));
  const [compareOn, setCompareOn] = useState(true);
  const diff = previous ? diffReports(report, previous) : null;
  // marks are drawn only while the switch is on
  const d = compareOn ? diff : null;

  // Export the separate A4 report sheet; keep the page view in its existing form layout.
  const pageRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  async function savePdf() {
    if (!pageRef.current || pdfBusy) return;
    setPdfBusy(true);
    void Swal.fire({ title: 'PDF를 만들고 있어요', text: '잠시만 기다려 주세요.', allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    try {
      await downloadReportPdf(pageRef.current, `iink_영양분석_${memberName || '회원'}_${pdfStamp(report.createdAt)}.pdf`);
      await Swal.fire({ icon: 'success', title: 'PDF를 저장했습니다', confirmButtonText: '확인', confirmButtonColor: GREEN });
    } catch (e) {
      Swal.close();
      await showError('PDF를 만들지 못했습니다', e);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <>
      <div className="report-pdf-stage" data-report-pdf-stage aria-hidden="true" style={{ position: 'fixed', left: '-2000px', top: 0, width: '952px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <ReportSheet report={report} name={memberName || '회원'} date={pdfDate} sheetRef={pageRef} />
      </div>
      <div className="rs-page min-h-screen w-full">
        <header className="mx-auto flex w-full max-w-[1000px] justify-end gap-2 px-4 pb-3 pt-5 sm:px-8 sm:pt-7" data-pdf-hide>
          <button type="button" onClick={() => void savePdf()} disabled={pdfBusy} className="rounded-full border border-[#cfe0d4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3d7a55] transition hover:bg-[#f4faf6] disabled:opacity-50">
            {pdfBusy ? 'PDF 만드는 중…' : 'PDF 다운로드'}
          </button>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="결과 닫기" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dfe4df] bg-white text-[#555550] transition hover:bg-[#f4faf6]"><CloseIcon /></button>
          ) : (
            <Link href="/" aria-label="결과 닫기" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dfe4df] bg-white text-[#555550] transition hover:bg-[#f4faf6]"><CloseIcon /></Link>
          )}
        </header>
        <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 pb-12 sm:gap-5 sm:px-8">
          {updatedNotice && <div data-pdf-hide role="status" className="rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-5 py-4 text-sm font-medium text-[#3d7a55] sm:text-base">{updatedNotice}</div>}
          {!report.isLatest && <div data-pdf-hide className="rounded-2xl border border-[#e9e7df] bg-white/85 px-5 py-4 text-sm text-[#5f5e58] sm:text-base">지난 결과입니다. 주문과 섭취 플랜은 최신 결과 기준입니다.</div>}
          {saved && <div data-pdf-hide className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-5 py-4 text-sm text-[#3d7a55] sm:text-base"><span>결과가 저장되었습니다.{chosen.length > 0 && ' 선택하신 데이터를 연결하면 결과 업데이트로 반영됩니다. 연결할 데이터가 없으면 설문 결과가 그대로 유지됩니다.'}</span><Link href="/results" className="shrink-0 font-semibold underline-offset-4 hover:underline">내 결과 보기</Link></div>}
          {diff && previous && <div data-pdf-hide><ChangeSummary diff={diff} prevDate={dayFormat.format(new Date(previous.createdAt))} on={compareOn} onToggle={() => setCompareOn((v) => !v)} /></div>}
          <ReportSheet report={report} name={memberName || '회원'} date={pdfDate} variant="web" />
          {showData && (
            <section data-pdf-hide className={`rs-web-card text-sm ${canUpdate ? 'rs-web-card-on' : ''}`}>
              <p className="font-semibold text-[#3b3b3b]">데이터 추가</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSheet('checkup')} className="rounded-xl bg-white px-4 py-2 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">검진 연결</button>
                <button type="button" onClick={() => setSheet('watch')} className="rounded-xl bg-white px-4 py-2 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">워치 연결</button>
              </div>
              <div className="mt-4">{check ? <UpdateCheckRows check={check} /> : checking ? <p className="text-[#85847e]">연결된 데이터를 확인하는 중…</p> : <p className="flex flex-wrap items-center gap-3 text-[#85847e]">연결된 데이터를 확인하지 못했습니다.<button type="button" onClick={reload} className="rounded-xl bg-white px-3 py-1.5 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">다시 확인</button></p>}</div>
              <button type="button" onClick={onUpdate} disabled={updating || checking || !canUpdate} className={`mt-4 rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${canUpdate ? 'bg-[#55aa7a] text-white hover:bg-[#3d7a55]' : 'bg-[#ecebe6] text-[#3b3b3b]'}`}>
                {updating ? '업데이트 중…' : '결과 업데이트'}
              </button>
              {check && !canUpdate && <p className="mt-2 text-xs text-[#85847e]">새로 반영할 데이터가 없어요. 검진이나 워치를 연결하면 업데이트할 수 있어요.</p>}
            </section>
          )}
          {guestBox}
          {sheet && <ConnectSheet kind={sheet} resultId={String(report._id)} onClose={closeSheet} />}
          <button data-pdf-hide onClick={onRestart} className="min-h-[64px] w-full rounded-[20px] bg-[#b2e2c5] px-5 text-[17px] font-semibold text-[#3d4141] transition-colors hover:bg-[#9fd8b6]">퀴즈 다시 하기</button>
        </main>
      </div>
    </>
  );
}
