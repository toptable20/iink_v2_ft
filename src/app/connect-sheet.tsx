'use client';

import { useCallback, useEffect, useState } from 'react';
import { showError } from '@/lib/alerts';
import { connectSmartQuizSource, getMySmartQuizCheckupStatus, getMySmartQuizWatchStatus } from '@/lib/smart-quiz';
import { CheckupLookup } from './checkup/checkup';
import { Devices } from './devices/devices';
import { InConnectSheet } from './update-check';

export type ConnectKind = 'checkup' | 'watch';

// ! The checkup / watch connection opened over the report, so the user never leaves it.
// * Opening or closing this sheet connects NOTHING. A source counts for this quiz only when the user presses
//   "이 결과에 연결하기" and the account really has usable data (the backend checks it again before it marks it).
// The lookup and the watch link are the same components as on /checkup and /devices.
// resultId: the report this sheet was opened from; the backend connects only if it is still the member's latest result.
export function ConnectSheet({ kind, resultId, onClose }: { kind: ConnectKind; resultId: string; onClose: (connected: boolean) => void }) {
  // Esc closes the sheet like the close button: it never connects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[28px] bg-[#f8f7f2] sm:rounded-[28px]">
        <div className="flex justify-end p-3 sm:px-6">
          <button type="button" onClick={() => onClose(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#5f5e58] hover:bg-white">
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
          <InConnectSheet.Provider value={true}>{kind === 'checkup' ? <CheckupLookup /> : <Devices />}</InConnectSheet.Provider>
        </div>
        <ConnectPanel kind={kind} resultId={resultId} onConnected={() => onClose(true)} />
      </div>
    </div>
  );
}

interface Ready {
  ok: boolean;
  // what the user reads: what is there to connect, or why nothing can be connected yet
  text: string;
}

const POLL_MS = 5000;

// Bottom bar of the sheet: shows what the account has right now and the one button that connects it to this quiz.
function ConnectPanel({ kind, resultId, onConnected }: { kind: ConnectKind; resultId: string; onConnected: () => void }) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [busy, setBusy] = useState(false);

  // The state changes while the sheet is open (the app syncs, the NHIS lookup finishes), so it is read again.
  useEffect(() => {
    let cancelled = false;
    const read = () =>
      (kind === 'watch' ? watchReady() : checkupReady())
        .then((r) => !cancelled && setReady(r))
        .catch(() => !cancelled && setReady({ ok: false, text: '연결 상태를 확인하지 못했습니다. 잠시 후 다시 확인합니다.' }));
    void read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [kind]);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      await connectSmartQuizSource(kind, resultId);
      onConnected();
    } catch (e) {
      await showError('이 결과에 연결하지 못했습니다', e);
    } finally {
      setBusy(false);
    }
  }, [kind, resultId, onConnected]);

  const label = kind === 'watch' ? '워치' : '건강검진';
  return (
    <div className={`border-t px-4 py-4 sm:px-6 ${ready?.ok ? 'border-[#a9dfbd] bg-[#eef8f1]' : 'border-[#e9e7df] bg-white'}`}>
      <p className="text-sm text-[#3b3b3b]">
        <span className="font-semibold">{label}</span>{' '}
        <span className={ready?.ok ? 'text-[#3d7a55]' : 'text-[#85847e]'}>{ready ? ready.text : '확인하는 중…'}</span>
      </p>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={!ready?.ok || busy}
        className="mt-3 w-full rounded-xl bg-[#55aa7a] px-4 py-3 font-semibold text-white transition hover:bg-[#3d7a55] disabled:cursor-not-allowed disabled:bg-[#ecebe6] disabled:text-[#9b9b96]"
      >
        {busy ? '연결하는 중…' : '이 결과에 연결하기'}
      </button>
    </div>
  );
}

// ? Same rule the backend applies before it marks the quiz (smart-quiz.service.ts sourceReady): the phone app is
//   linked AND at least one watch item has the minimum measured days of the last 7.
async function watchReady(): Promise<Ready> {
  const s = await getMySmartQuizWatchStatus();
  if (!s.connected) return { ok: false, text: '아직 연결되지 않았습니다. iink 앱에 연결 코드를 입력한 뒤 앱에서 동기화해 주세요.' };
  const days = Math.max(0, ...s.items.map((i) => i.days));
  if (s.items.some((i) => i.status === 'used' && i.days >= s.minDays)) {
    return { ok: true, text: `최근 7일 중 ${days}일 측정된 데이터가 있습니다. 이 결과에 연결할 수 있어요.` };
  }
  return { ok: false, text: `최근 7일 중 ${days}일만 측정되어 사용할 수 없어요 (${s.minDays}일 이상 필요). 앱에서 동기화한 뒤 다시 확인해 주세요.` };
}

async function checkupReady(): Promise<Ready> {
  const s = await getMySmartQuizCheckupStatus();
  const when = s.examDate ? `${s.examDate} 검진` : s.year ? `${s.year} 검진` : '검진';
  switch (s.status) {
    case 'usable':
      return { ok: true, text: `${when}을 가져왔습니다. 이 결과에 연결할 수 있어요.` };
    case 'too-old':
      return { ok: false, text: `최근 ${when}은 24개월이 지나 사용할 수 없습니다.` };
    case 'bad-exam-date':
      return { ok: false, text: '검진일을 확인할 수 없어 사용할 수 없습니다.' };
    case 'no-label-map':
      return { ok: false, text: `${when}을 가져왔지만 아직 결과에 반영할 수 없습니다.` };
    default:
      return { ok: false, text: '아직 가져온 검진 결과가 없습니다. 위에서 건강검진을 조회해 주세요.' };
  }
}
