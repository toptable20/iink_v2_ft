'use client';

import type { SmartQuizMeasuredRow, SmartQuizResult } from '@/lib/smart-quiz';

// TEMPORARY (Max, 2026-11-11): for the CEO / team leader check only; remove after their review (07_BACKEND_API.md §4 item 13).
// "사용한 검진·워치 데이터": folded box under the report form. Lists what this result received from the checkup and
// the watch, value by value, and whether each was used (Excel 11_검진입력 / 12_워치입력 status; only 유효 is used).

// Excel item names carry notes for the team ("[검증 전]", "[미테스트]"); the member does not need them.
const cleanName = (name: string) => name.replace(/\s*\[[^\]]*\]/g, '').trim();
const value = (m: SmartQuizMeasuredRow) => (m.value == null ? '–' : `${m.value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} ${m.unit}`);

function reason(m: SmartQuizMeasuredRow, minDays: number, notReceived: boolean): { used: boolean; text: string } {
  if (notReceived) return { used: false, text: '워치에서 수신 안 됨' };
  switch (m.status) {
    case '유효':
      return { used: true, text: m.days != null ? `사용 · 7일 중 ${m.days}일` : '사용' };
    case '측정일수 부족':
      return { used: false, text: `미사용 · 7일 중 ${m.days ?? 0}일 (${minDays}일 이상 필요)` };
    case '범위 밖':
      return { used: false, text: '미사용 · 입력 가능 범위 밖' };
    case '검진 만료':
      return { used: false, text: '미사용 · 검진 후 24개월 지남' };
    default:
      return { used: false, text: '측정값 없음' };
  }
}

function Rows({ rows, minDays, notReceived = new Set<string>() }: { rows: SmartQuizMeasuredRow[]; minDays: number; notReceived?: Set<string> }) {
  return (
    <ul className="mt-2 divide-y divide-[#eceae3] rounded-xl border border-[#e9e7df] bg-white">
      {rows.map((m) => {
        const r = reason(m, minDays, notReceived.has(m.id));
        return (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
            <span className="text-[#3b3b3b]">{cleanName(m.name)}</span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums font-medium">{value(m)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.used ? 'bg-[#dceee6] text-[#3d7a55]' : 'bg-[#f1f0eb] text-[#85847e]'}`}>{r.text}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// minDays: from the backend watch status (60_파라미터 B65 = 4); 4 is only the fallback before it loads.
export function UsedData({ report, minDays = 4 }: { report: SmartQuizResult; minDays?: number }) {
  const measured = report.result.measured;
  if (!measured) return null;
  const checkupRows = measured.checkup.filter((m) => m.status !== '미입력');
  const watchRows = measured.watch;
  const watchSource = report.sources.watch;
  // SpO2 (W06) now arrives like every other item (the app averages its own night readings); a watch item
  // the app genuinely cannot send still falls back to '워치에서 수신 안 됨' via this set. Both lists follow
  // the Excel's watch item order (W01–W06).
  const notReceived = new Set(watchRows.filter((m, i) => m.value == null && watchSource.items[i]?.status === 'not-available').map((m) => m.id));
  const anyWatch = watchRows.some((m) => m.value != null);
  const exam = report.sources.checkup.examDate;

  return (
    <details className="group rounded-2xl border border-[#e9e7df] bg-white/75 px-5 py-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-[#3b3b3b]">
        사용한 검진·워치 데이터
        <span className="text-xs text-[#85847e] group-open:hidden">열기 ▾</span>
        <span className="hidden text-xs text-[#85847e] group-open:inline">닫기 ▴</span>
      </summary>

      <div className="mt-4">
        <p className="font-semibold text-[#3d7a55]">건강검진{exam ? ` · 검진일 ${exam}` : ''}</p>
        {checkupRows.length ? <Rows rows={checkupRows} minDays={minDays} /> : <p className="mt-1 text-[#85847e]">이 결과에는 검진 데이터가 없습니다.</p>}
      </div>

      <div className="mt-5">
        <p className="font-semibold text-[#3d7a55]">워치{watchSource.from ? ` · ${watchSource.from} ~ ${watchSource.to}` : ''}</p>
        {anyWatch ? <Rows rows={watchRows} minDays={minDays} notReceived={notReceived} /> : <p className="mt-1 text-[#85847e]">이 결과에는 워치 데이터가 없습니다.</p>}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[#85847e]">
        &lsquo;사용&rsquo; 표시된 값만 결과 계산에 쓰였습니다. 워치 값은 최근 7일 기준이며, 항목마다 {minDays}일 이상 측정되어야 사용됩니다.
      </p>
    </details>
  );
}
