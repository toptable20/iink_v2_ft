'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/auth';
import { createLinkCode, fetchLinkStatus, type LinkCode, type LinkStatus, type WearableDay } from '@/lib/wearables';
import { UpdateResultPrompt } from '../update-result-prompt';
import { Card } from '../ui';

const STORAGE_KEY = 'iink.linkId';
const POLL_MS = 5000;

function readStoredLinkId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLinkId(linkId: string | null) {
  try {
    if (linkId) localStorage.setItem(STORAGE_KEY, linkId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode etc.: the page still works, it just forgets the link on reload.
  }
}

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('ko-KR', { weekday: 'short', month: 'short', day: 'numeric' });
const formatSleep = (m: number) => `${Math.floor(m / 60)}시간 ${m % 60}분`;
const formatTime = (iso: string) => new Date(iso).toLocaleString('ko-KR');

// Where a day's numbers were read from on the phone.
const SOURCE_NAME: Record<WearableDay['source'], string> = {
  apple: 'Apple Health',
  health_connect: 'Health Connect 경유',
  samsung_sdk: '삼성 헬스 (직접)',
};

function Value({ value }: { value: string | null }) {
  return value == null ? <span className="text-[#85847e]">데이터 없음</span> : <span className="font-medium text-[#3b3b3b]">{value}</span>;
}

// 12_워치입력 (V9 Excel): the only watch data the quiz result uses. Item names are the Excel's.
// 수면 효율 follows the Excel's formula (AH6): 실제 수면시간 ÷ (수면시간 + 깬 시간) × 100, from the sleep stages.
function sleepEfficiency(day: WearableDay): string | null {
  const { sleepLightMinutes: light, sleepDeepMinutes: deep, sleepRemMinutes: rem, sleepAwakeMinutes: awake } = day;
  if (light == null || deep == null || rem == null || awake == null) return null;
  const asleep = light + deep + rem;
  return asleep + awake > 0 ? `${((asleep / (asleep + awake)) * 100).toFixed(1)}%` : null;
}

export function Devices() {
  const session = useSession();
  const [linkId, setLinkId] = useState<string | null>(null);
  const [code, setCode] = useState<LinkCode | null>(null);
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // localStorage is read after mount on purpose: reading it during render (or in a lazy
  // useState initializer) would make the server and client render different markup and
  // cause a hydration mismatch. Runs once, so no cascading renders.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLinkId(readStoredLinkId()), []);

  const refresh = useCallback(async () => {
    if (!linkId) return;
    try {
      setStatus(await fetchLinkStatus(linkId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [linkId]);

  useEffect(() => {
    if (!linkId) return;
    // First poll fires immediately so the page is not blank for POLL_MS; the rest are on
    // the interval. refresh() is async, so its setState lands in a later tick, not during
    // this effect — the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [linkId, refresh]);

  async function startLink() {
    setBusy(true);
    try {
      const next = await createLinkCode();
      setCode(next);
      setStatus(null);
      setLinkId(next.linkId);
      storeLinkId(next.linkId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setLinkId(null);
    setCode(null);
    setStatus(null);
    storeLinkId(null);
  }

  const linked = status?.linked ?? false;

  return (
    <Card className="max-w-[900px] border border-[#e9e7df] bg-[#fbfaf7]">
      <p className="text-xs font-semibold tracking-[.16em] text-[#55aa7a]">건강 데이터 연동</p>
      <h1 className="mt-3 text-[28px] font-semibold tracking-[-.03em] text-[#3b3b3b] sm:text-[34px]">워치 데이터 연결</h1>
      <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#686860] sm:text-base">
        iink 앱을 통해 Apple Watch 또는 갤럭시 워치의 수면, 심박수, 걸음수, 활동 시간 데이터를 연결하세요. 데이터는 맞춤 추천에만 사용되며 의학적 진단에는 사용되지 않습니다.
      </p>
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#e9e7df] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-sm font-semibold text-[#3b3b3b]">Android용 iink 앱</p>
          <p className="mt-1 text-xs leading-relaxed text-[#85847e]">앱을 설치한 뒤 워치 데이터를 동기화해 주세요.</p>
        </div>
        <a href="/app/iink.apk?v=1.0.17" download="iink-1.0.17.apk" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cfe8d8] px-4 text-sm font-semibold text-[#3d7a55] transition hover:bg-[#eef8f1]">
          앱 다운로드
        </a>
      </div>

      {!linkId && !session && (
        <p className="mt-6 rounded-2xl border border-[#e9e7df] bg-white px-5 py-4 text-[15px] leading-relaxed text-[#5f5e58]">
          먼저{' '}
          <Link href="/login" className="font-semibold text-[#3d7a55] underline underline-offset-4">
            로그인
          </Link>
          해 주세요. 워치 데이터는 회원님의 계정에 저장됩니다.
        </p>
      )}

      {!linkId && session && (
        <div className="mt-6">
          <button type="button" onClick={startLink} disabled={busy} className="min-h-[64px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[17px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? '연결 코드 준비 중…' : '연결 코드 받기'}
          </button>
        </div>
      )}

      {linkId && !linked && (
        <div className="mt-6 rounded-[24px] border border-[#cfe8d8] bg-[#eef8f1] px-5 py-6 text-center sm:px-8 sm:py-8">
          {status?.unlinkedAt ? (
            <p className="text-[15px] leading-7 text-[#5f5e58]">
              휴대폰과의 연결이 해제되었습니다 ({formatTime(status.unlinkedAt)}).
              <br />
              다시 연결하려면 새 코드를 받으세요.
            </p>
          ) : code ? (
            <>
              <p className="text-[15px] font-medium text-[#3d7a55]">iink 앱에 아래 연결 코드를 입력하세요</p>
              <p className="my-4 inline-flex min-h-[76px] items-center rounded-2xl border border-[#cfe8d8] bg-white px-6 font-mono text-4xl font-bold tracking-[.24em] text-[#3d7a55] sm:text-5xl">{code.code}</p>
              <p className="text-sm text-[#686860]">
                {new Date(code.expiresAt).toLocaleTimeString('ko-KR')}까지 유효 · 앱 연결을 기다리는 중…
              </p>
            </>
          ) : (
            <p className="text-[15px] text-[#5f5e58]">앱 연결을 기다리는 중…</p>
          )}
          <button type="button" onClick={startLink} disabled={busy} className="mt-5 min-h-11 rounded-full border border-[#a9dfbd] bg-white px-5 text-sm font-semibold text-[#3d7a55] transition hover:bg-[#f5fbf7] disabled:opacity-50">
            {busy ? '새 코드 준비 중…' : '새 코드 받기'}
          </button>
        </div>
      )}

      {linked && status && (
        <div className="mt-6">
          <div className="flex flex-col gap-2 rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#3d7a55]">
              <span className="grid size-6 place-items-center rounded-full bg-[#55aa7a] text-xs text-white" aria-hidden="true">✓</span>
              연결됨 · {status.platform === 'apple' ? 'Apple Health' : 'Android'}
            </span>
            <span className="text-sm text-[#5f6f61]">
              마지막 동기화: {status.lastSyncAt ? formatTime(status.lastSyncAt) : '아직 없음'}
            </span>
          </div>

          {status.days.length > 0 && <UpdateResultPrompt what="워치 데이터" />}

          {status.days.length > 0 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#3b3b3b]">날짜별 워치 데이터</h2>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#686860]">{status.days.length}개 기록</span>
            </div>
          )}

          {status.days.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[#d8d6cd] bg-white/70 px-5 py-6 text-center text-sm leading-relaxed text-[#85847e]">앱에서 아직 데이터를 보내지 않았습니다. 워치와 iink 앱을 동기화한 뒤 다시 확인해 주세요.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {status.days.map((day) => (
                <li key={`${day.date}-${day.source}`} className="rounded-2xl border border-[#e9e7df] bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#3b3b3b]">{formatDay(day.date)}</p>
                    <span className="rounded-full bg-[#f5f7f3] px-3 py-1 text-xs font-medium text-[#686860]">{SOURCE_NAME[day.source]}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    <div className="rounded-xl bg-[#f8f7f2] px-3 py-3"><dt className="text-xs text-[#85847e]">수면 시간</dt><dd className="mt-1 text-sm"><Value value={day.sleepMinutes == null ? null : formatSleep(day.sleepMinutes)} /></dd></div>
                    <div className="rounded-xl bg-[#f8f7f2] px-3 py-3"><dt className="text-xs text-[#85847e]">수면 효율</dt><dd className="mt-1 text-sm"><Value value={sleepEfficiency(day)} /></dd></div>
                    <div className="rounded-xl bg-[#f8f7f2] px-3 py-3"><dt className="text-xs text-[#85847e]">하루 최저 심박수</dt><dd className="mt-1 text-sm"><Value value={day.heartRateMin == null ? null : `${day.heartRateMin} bpm`} /></dd></div>
                    <div className="rounded-xl bg-[#f8f7f2] px-3 py-3"><dt className="text-xs text-[#85847e]">걸음수</dt><dd className="mt-1 text-sm"><Value value={day.steps == null ? null : `${day.steps.toLocaleString('ko-KR')}보`} /></dd></div>
                    <div className="rounded-xl bg-[#f8f7f2] px-3 py-3"><dt className="text-xs text-[#85847e]">활동 시간</dt><dd className="mt-1 text-sm"><Value value={day.activeTimeMinutes == null ? null : `${day.activeTimeMinutes}분`} /></dd></div>
                    <div className="rounded-xl bg-[#f8f7f2] px-3 py-3"><dt className="text-xs text-[#85847e]">야간 혈중 산소(SpO2) 평균</dt><dd className="mt-1 text-sm"><Value value={day.spo2Night == null ? null : `${day.spo2Night.toFixed(1)}%`} /></dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
          {status.days.length > 0 && (
            <p className="mt-4 rounded-xl bg-[#f5f7f3] px-4 py-3 text-xs leading-relaxed text-[#686860]">퀴즈 결과 계산에는 삼성 헬스(직접)에서 받은 최근 7일 데이터만 사용됩니다.</p>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-relaxed text-rose-700">{error}</p>}

      {linkId && (
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-full px-4 text-sm text-[#85847e] underline underline-offset-4 hover:bg-white">
          이 브라우저에서 연결 정보 지우기
        </button>
      )}
    </Card>
  );
}
