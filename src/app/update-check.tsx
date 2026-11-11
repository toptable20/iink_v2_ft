'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import {
  getMySmartQuizCheckupStatus,
  getMySmartQuizWatchStatus,
  getSmartQuizNewData,
  type SmartQuizCheckupStatus,
  type SmartQuizNewData,
  type SmartQuizWatchStatus,
} from '@/lib/smart-quiz';

// True inside the connect sheet over the report: the report's own check + update button is used there,
// so the update prompt inside the lookup / watch page hides itself.
export const InConnectSheet = createContext(false);

export interface UpdateCheck {
  newData: SmartQuizNewData;
  checkup: SmartQuizCheckupStatus;
  watch: SmartQuizWatchStatus;
}

// What a new result would use (the backend runs the V9 engine on the current data without saving),
// plus the checkup / watch details for the reasons. resultId null = my latest result.
export function useUpdateCheck(resultId: string | null, enabled = true) {
  const [tick, setTick] = useState(0);
  const key = `${resultId}:${tick}`;
  const [got, setGot] = useState<{ key: string; check: UpdateCheck | null } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([getSmartQuizNewData(resultId), getMySmartQuizCheckupStatus(), getMySmartQuizWatchStatus()])
      .then(([newData, checkup, watch]) => !cancelled && setGot({ key, check: { newData, checkup, watch } }))
      .catch(() => !cancelled && setGot({ key, check: null }));
    return () => {
      cancelled = true;
    };
  }, [enabled, resultId, key]);

  // check again (after the connect sheet closes, or after an update)
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const check = got?.check ?? null;
  const loading = enabled && got?.key !== key;
  return { check, loading, reload, canUpdate: Boolean(!loading && check && (check.newData.checkup || check.newData.watch)) };
}

type Mark = 'ok' | 'new' | 'no' | 'off';
interface Row {
  kind: 'checkup' | 'watch';
  label: string;
  mark: Mark;
  text: string;
}

// One line per optional source: ✓ will be / is used, ✕ cannot be used (and why), ○ not connected.
export function checkRows(c: UpdateCheck): Row[] {
  const usesCheckup = c.newData.wouldUse.includes('검진');
  const usesWatch = c.newData.wouldUse.includes('워치');

  const when = c.checkup.examDate ? `${c.checkup.examDate} 검진` : c.checkup.year ? `${c.checkup.year} 검진` : '검진';
  let checkup: Row;
  if (usesCheckup) checkup = { kind: 'checkup', label: '건강검진', mark: c.newData.checkup ? 'new' : 'ok', text: `${when} · ${c.newData.checkup ? '업데이트하면 반영돼요' : '이 결과에 반영됨'}` };
  else if (c.checkup.status === 'none') checkup = { kind: 'checkup', label: '건강검진', mark: 'off', text: '연결 안 됨' };
  else if (c.checkup.status === 'too-old') checkup = { kind: 'checkup', label: '건강검진', mark: 'no', text: `${when}은 24개월이 지나 사용할 수 없어요` };
  else if (c.checkup.status === 'bad-exam-date') checkup = { kind: 'checkup', label: '건강검진', mark: 'no', text: '검진일을 확인할 수 없어 사용할 수 없어요' };
  else if (c.checkup.status === 'no-label-map') checkup = { kind: 'checkup', label: '건강검진', mark: 'no', text: `${when}을 가져왔지만 아직 결과에 반영할 수 없어요` };
  else checkup = { kind: 'checkup', label: '건강검진', mark: 'no', text: `${when} · 반영할 수 있는 검진 항목이 부족해요` };

  const days = Math.max(0, ...c.watch.items.map((i) => i.days));
  let watch: Row;
  if (usesWatch) watch = { kind: 'watch', label: '워치', mark: c.newData.watch ? 'new' : 'ok', text: `최근 7일 중 ${days}일 측정 · ${c.newData.watch ? '업데이트하면 반영돼요' : '이 결과에 반영됨'}` };
  else if (!c.watch.connected) watch = { kind: 'watch', label: '워치', mark: 'off', text: '연결 안 됨' };
  else if (days < c.watch.minDays) watch = { kind: 'watch', label: '워치', mark: 'no', text: `최근 7일 중 ${days}일 측정 · ${c.watch.minDays}일 이상 필요해요` };
  else watch = { kind: 'watch', label: '워치', mark: 'no', text: `최근 7일 중 ${days}일 측정 · 반영할 수 있는 측정 항목이 부족해요` };

  return [checkup, watch];
}

const MARK: Record<Mark, { sign: string; cls: string }> = {
  new: { sign: '✓', cls: 'bg-[#55aa7a] text-white' },
  ok: { sign: '✓', cls: 'bg-[#dceee6] text-[#3d7a55]' },
  no: { sign: '✕', cls: 'bg-[#f6e3e1] text-[#b4534a]' },
  off: { sign: '○', cls: 'bg-[#ecebe6] text-[#85847e]' },
};

export function UpdateCheckRows({ check, only }: { check: UpdateCheck; only?: 'checkup' | 'watch' }) {
  return (
    <ul className="flex flex-col gap-2">
      {checkRows(check)
        .filter((r) => !only || r.kind === only)
        .map((r) => (
          <li key={r.kind} className="flex items-start gap-2.5">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${MARK[r.mark].cls}`} aria-hidden="true">
              {MARK[r.mark].sign}
            </span>
            <span>
              <span className="font-semibold text-[#3b3b3b]">{r.label}</span>
              <span className="ml-2 text-[#5f5e58]">{r.text}</span>
            </span>
          </li>
        ))}
    </ul>
  );
}
