'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useSession } from '@/lib/auth';
import type { SmartQuizResult } from '@/lib/smart-quiz';
import { ConnectSheet, type ConnectKind } from './connect-sheet';
import { UpdateCheckRows, useUpdateCheck } from './update-check';
import { ChangeSummary, Changed, NewTag, changedRow, diffReports } from './report-compare';
import { UsedData } from './used-data';
import { ProfileCard } from './profile-card';

const card = 'rounded-[28px] border border-[#e9e7df] bg-[#fbfaf7] px-5 py-7 sm:px-8 sm:py-9';

const dayFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

const num = (n: number | null | undefined) => (n == null ? '–' : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));

const th = 'whitespace-nowrap bg-[#dceee6] px-4 py-3 text-left text-xs font-semibold text-[#3d7a55] sm:text-sm';
const td = 'border-t border-[#e9e7df] px-4 py-3 align-top leading-relaxed';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#3b3b3b" />
      <path d="m6 10.2 2.7 2.6L14 7.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[18px] font-semibold sm:text-[20px]">
      <CheckIcon />
      {children}
    </h2>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: true });

  function updateScrollEdges(element: HTMLDivElement) {
    setScrollEdges({
      left: element.scrollLeft > 1,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }

  return (
    <div className="relative mt-4 max-w-full min-w-0 overflow-hidden rounded-[16px] border border-[#cfe8d8] bg-white">
      <p className="flex items-center justify-between gap-3 border-b border-[#cfe8d8] bg-[#f5fbf7] px-4 py-3 text-xs font-medium text-[#3d7a55] sm:hidden">
        <span>{scrollEdges.right ? '오른쪽에 항목이 더 있어요. 좌우로 밀어 확인하세요.' : '왼쪽으로 밀어 앞 항목을 볼 수 있어요.'}</span>
        <span className="shrink-0 text-base" aria-hidden="true">{scrollEdges.right ? '→' : '←'}</span>
      </p>
      <div className="relative min-w-0">
        <div
          role="region"
          aria-label={`${head.join(', ')} 표. 좌우로 스크롤할 수 있습니다.`}
          tabIndex={0}
          onScroll={(event) => updateScrollEdges(event.currentTarget)}
          className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#55aa7a]"
        >
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>
                {head.map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
        {scrollEdges.right && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center bg-gradient-to-l from-white via-white/80 to-transparent text-xl font-semibold text-[#3d7a55] sm:hidden" aria-hidden="true">
            ›
          </div>
        )}
        {scrollEdges.left && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center bg-gradient-to-r from-white via-white/80 to-transparent text-xl font-semibold text-[#3d7a55] sm:hidden" aria-hidden="true">
            ‹
          </div>
        )}
      </div>
    </div>
  );
}

// onUpdate: make a NEW result from the latest quiz + current checkup/watch data (this one is kept).
// The 데이터 추가 box checks what a new result would use (engine dry run on the backend): ✓ / ✕ per source,
// and the update button works only when a new result would add something.
// updatedNotice: shown once after an update, e.g. "설문 + 워치 데이터를 반영해 결과를 업데이트했습니다."
// Only the latest result can add data, update and order; older results are history (the report body stays as saved).
export function ReportView({
  report,
  onRestart,
  onClose,
  saved = false,
  onUpdate,
  updating = false,
  updatedNotice,
  previous,
}: {
  report: SmartQuizResult;
  onRestart: () => void;
  // X: back to the results list (without it, X goes home)
  onClose?: () => void;
  saved?: boolean;
  onUpdate?: () => void;
  updating?: boolean;
  updatedNotice?: string | null;
  // the result made just before this one: changed values are marked (green, bold, old value in grey)
  previous?: SmartQuizResult | null;
}) {
  const [sheet, setSheet] = useState<ConnectKind | null>(null);
  const showData = Boolean(onUpdate && report.isLatest);
  const { check, loading: checking, reload, canUpdate } = useUpdateCheck(String(report._id), showData);
  // after an update the new result arrives with a new id, so the check runs again against it
  const session = useSession();
  const memberName = session?.member.memberNick.trim() || '';
  const asOf = dayFormat.format(new Date(report.createdAt));
  const r = report.result;
  const { product } = r;
  const [compareOn, setCompareOn] = useState(true);
  const diff = previous ? diffReports(report, previous) : null;
  // marks are drawn only while the switch is on
  const d = compareOn ? diff : null;

  return (
    <div className="min-h-screen w-full bg-[#f8f7f2] font-sans text-[#3b3b3b]">
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-4 px-5 pb-7 pt-7 sm:px-8 sm:pb-9 sm:pt-10 lg:px-10">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <div className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-full bg-[#dceee6] text-[27px] font-semibold text-[#55aa7a] sm:h-[76px] sm:w-[76px] sm:text-[30px]">
            {memberName ? [...memberName][0]?.toUpperCase() : '나'}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] leading-tight text-[#3b3b3b] sm:text-[28px]">
              <span className="font-semibold text-[#55aa7a]">{memberName || '회원'}</span>님의 영양 분석
            </h1>
            <p className="mt-2 text-sm text-[#55aa7a] sm:text-base">({asOf} 기준)</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="결과 닫기"
            className="ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#555550] transition hover:bg-[#efeee8]"
          >
            <CloseIcon />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="결과 닫기"
            className="ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#555550] transition hover:bg-[#efeee8]"
          >
            <CloseIcon />
          </Link>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 pb-16 sm:gap-6 sm:px-8 lg:px-10">
        {updatedNotice && (
          <div role="status" className="rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-5 py-4 text-sm font-medium text-[#3d7a55] sm:text-base">
            {updatedNotice}
          </div>
        )}
        {!report.isLatest && (
          <div className="rounded-2xl border border-[#e9e7df] bg-white/75 px-5 py-4 text-sm text-[#5f5e58] sm:text-base">
            지난 결과입니다. 주문과 섭취 플랜은 최신 결과 기준입니다.
          </div>
        )}
        {saved && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-5 py-4 text-sm text-[#3d7a55] sm:text-base">
            <span>결과가 저장되었습니다.</span>
            <Link href="/results" className="shrink-0 font-semibold underline-offset-4 hover:underline">
              내 결과 보기
            </Link>
          </div>
        )}

        {diff && previous && (
          <ChangeSummary diff={diff} prevDate={dayFormat.format(new Date(previous.createdAt))} on={compareOn} onToggle={() => setCompareOn((v) => !v)} />
        )}

        <section className={card}>
          <dl className="flex flex-col gap-5 text-sm sm:text-base">
            <div>
              <dt className="text-xs font-semibold text-[#3d7a55]">출력 상태</dt>
              <dd className="mt-2 text-[17px] font-medium sm:text-lg"><Changed was={d?.status}>{r.status}</Changed></dd>
            </div>
            {r.bmi != null && !r.profile && (
              <div>
                <dt className="text-xs font-semibold text-[#3d7a55]">BMI</dt>
                <dd className="mt-2 text-[17px] font-medium sm:text-lg">
                  <Changed was={d?.bmi}>{r.bmi.toFixed(1)}</Changed>
                  <span className="ml-2 text-xs font-normal text-[#85847e]">
                    ({r.bmiSource === 'checkup' ? '검진 키·체중 기준' : r.bmiSource === 'mixed' ? '검진·설문 키·체중 기준' : '설문 키·체중 기준'})
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold text-[#3d7a55]">안내 문구</dt>
              <dd className="mt-2 max-w-[900px] leading-7 text-[#5f5e58]">{r.notice || '–'}</dd>
            </div>
          </dl>
        </section>

        <ProfileCard report={report} />

        <section className={card}>
          <SectionTitle>9개 Topic</SectionTitle>
          <Table head={['Topic', 'Level(1–10)', '최종 점수', '신뢰도', '사용 소스', '하한 사유', '판정 단계']}>
            {r.topics.map((t) => {
              const c = d?.topics.get(t.topic);
              return (
                <tr key={t.topic} className={c ? changedRow : undefined}>
                  <td className={`${td} font-medium`}>{t.topic}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <Changed was={c?.level}>{t.displayLevel}</Changed>
                    {t.levelNote && <span className="ml-1 text-xs text-[#85847e]">{t.levelNote}</span>}
                  </td>
                  <td className={`${td} tabular-nums`}><Changed was={c?.score}>{num(t.score)}</Changed></td>
                  <td className={td}><Changed was={c?.confidence}>{t.confidence || '–'}</Changed></td>
                  <td className={td}><Changed was={c?.sources}>{t.sourcesUsed || '–'}</Changed></td>
                  <td className={td}>{t.floorReason || '–'}</td>
                  <td className={td}><Changed was={c?.stage}>{t.stage || '–'}</Changed></td>
                </tr>
              );
            })}
          </Table>
          <p className="mt-4 text-sm leading-relaxed text-[#85847e]">
            Level은 영양 관리 우선순위이며 질병 진단·치료·예방 표현이 아닙니다.
          </p>
        </section>

        <section className={card}>
          <SectionTitle>우선 영양소 Top 5</SectionTitle>
          <Table head={['영양소', '요구지수', '주요 근거 Topic', '1회 목표량', '실제 공급량', '단위']}>
            {r.topNutrientRows.map((n) => {
              const c = d?.nutrients.get(n.name);
              return (
                <tr key={n.rank} className={c ? changedRow : undefined}>
                  <td className={`${td} font-medium`}>
                    {c?.isNew ? <span className="font-bold text-[#2f8a57]">{n.name}</span> : n.name}
                    {c?.isNew && <NewTag />}
                  </td>
                  <td className={`${td} tabular-nums`}><Changed was={c?.need}>{num(n.correctedNeed)}</Changed></td>
                  <td className={td}>{n.mainTopic ?? '–'}</td>
                  <td className={`${td} tabular-nums`}><Changed was={c?.perServing}>{num(n.perServing)}</Changed></td>
                  <td className={`${td} tabular-nums`}><Changed was={c?.supplied}>{n.suppliedText ?? num(n.supplied)}</Changed></td>
                  <td className={td}>{n.unit}</td>
                </tr>
              );
            })}
          </Table>
          {d && d.removedNutrients.length > 0 && (
            <p className="mt-3 text-sm text-[#85847e]">이전 결과에서 빠진 영양소: {d.removedNutrients.join(', ')}</p>
          )}
        </section>

        <section className={card}>
          <SectionTitle>푸디언 3.0 전송값</SectionTitle>
          <Table head={['카트리지명', '출력(g)', '출력(ml)', '비고']}>
            {r.ink.map((i) => (
              <tr key={i.id} className={d?.ink.has(i.id) ? changedRow : undefined}>
                <td className={`${td} font-medium`}>{i.name}</td>
                <td className={`${td} tabular-nums`}><Changed was={d?.ink.get(i.id)}>{num(i.g)}</Changed></td>
                <td className={`${td} tabular-nums`}>{num(i.ml)}</td>
                <td className={td}>{i.note || '–'}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-sm">
            합계 <span className="font-semibold tabular-nums"><Changed was={d?.inkTotal}>{num(r.inkTotalG)}</Changed></span> g
          </p>
        </section>

        <section className={card}>
          <SectionTitle>추천 제품·섭취 플랜</SectionTitle>
          <div className="mt-4 overflow-hidden rounded-[20px] border border-[#cfe8d8] bg-white">
            {(
              [
                ['현재 제공 제품', product.offered1],
                ['조합 제품', product.offered2],
                ['조합 여부', product.combined ? '조합' : '단일'],
                ['28일 섭취 플랜', product.plan],
                ['라인업 기준 추천(참고)', product.lineupText],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className={`flex min-h-[54px] min-w-0 flex-col border-b border-[#e9e7df] last:border-b-0 sm:flex-row ${d?.product.has(label) ? changedRow : ''}`}>
                <span className="w-full shrink-0 bg-[#dceee6] px-4 py-3 text-sm leading-relaxed text-[#3d7a55] sm:w-[210px] sm:py-4">{label}</span>
                <span className="min-w-0 flex-1 break-words px-4 py-3 text-sm leading-relaxed sm:py-4 sm:text-base">
                  <Changed was={d?.product.get(label)}>{value || '–'}</Changed>
                </span>
              </div>
            ))}
          </div>
        </section>

        <UsedData report={report} minDays={check?.watch.minDays} />

        {showData && (
          <section className={`rounded-2xl px-5 py-4 text-sm ${canUpdate ? 'border border-[#a9dfbd] bg-[#eef8f1]' : 'bg-white/75'}`}>
            <p className="font-medium text-[#3b3b3b]">데이터 추가</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSheet('checkup')} className="rounded-xl bg-white px-4 py-2 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">
                검진 연결
              </button>
              <button type="button" onClick={() => setSheet('watch')} className="rounded-xl bg-white px-4 py-2 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">
                워치 연결
              </button>
            </div>
            <div className="mt-4">
              {check ? (
                <UpdateCheckRows check={check} />
              ) : checking ? (
                <p className="text-[#85847e]">연결된 데이터를 확인하는 중…</p>
              ) : (
                <p className="flex flex-wrap items-center gap-3 text-[#85847e]">
                  연결된 데이터를 확인하지 못했습니다.
                  <button type="button" onClick={reload} className="rounded-xl bg-white px-3 py-1.5 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">
                    다시 확인
                  </button>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onUpdate}
              disabled={updating || checking || !canUpdate}
              className={`mt-4 rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                canUpdate ? 'bg-[#55aa7a] text-white hover:bg-[#3d7a55]' : 'bg-[#ecebe6] text-[#3b3b3b]'
              }`}
            >
              {updating ? '업데이트 중…' : '결과 업데이트'}
            </button>
            {check && !canUpdate && <p className="mt-2 text-xs text-[#85847e]">새로 반영할 데이터가 없어요. 검진이나 워치를 연결하면 업데이트할 수 있어요.</p>}
          </section>
        )}
        {sheet && (
          <ConnectSheet
            kind={sheet}
            onClose={() => {
              setSheet(null);
              reload();
            }}
          />
        )}

        <button
          onClick={onRestart}
          className="mt-1 min-h-[72px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[18px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa]"
        >
          퀴즈 다시 하기
        </button>
      </main>
    </div>
  );
}
