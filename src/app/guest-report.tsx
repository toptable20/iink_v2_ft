'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { GREEN, confirmAction, showError } from '@/lib/alerts';
import { guestLinkCode, guestLinkStatus, guestNhisLookup, guestResult, type GuestAnswer } from '@/lib/guest';
import type { Carrier, Checkup, LoginOrg } from '@/lib/nhis';
import type { SmartQuizResult } from '@/lib/smart-quiz';
import type { LinkCode, LinkStatus, WearableDay } from '@/lib/wearables';
import { ReportView } from './report-view';

// Guest report (no login). Everything lives in this component's state only: the result, the NHIS checkup years and
// the watch days. Nothing is written to the server's database; closing or reloading the page loses it all.
// Same order as for members: the first result is quiz-only, the guest connects NHIS / the watch in the 데이터 추가
// box, and 결과 업데이트 runs the engine again with what was connected.

export type GuestExtra = 'checkup' | 'watch';

const POLL_MS = 5000;
const WATCH_SOURCE = 'samsung_sdk'; // the only watch source the V9 engine reads (12_워치입력)
const kstDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);

// the watch days of the engine's 7-day window (evaluation date = today in Korea), Samsung Health only
function windowDays(days: WearableDay[]): WearableDay[] {
  const to = kstDate(new Date());
  const from = kstDate(new Date(Date.now() - 6 * 864e5));
  return days.filter((d) => d.source === WATCH_SOURCE && d.date >= from && d.date <= to);
}

export function GuestReport({ answers, extras, onRestart }: { answers: GuestAnswer[]; extras: GuestExtra[]; onRestart: () => void }) {
  const router = useRouter();
  const [report, setReport] = useState<SmartQuizResult | null>(null);
  const [previous, setPrevious] = useState<SmartQuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkups, setCheckups] = useState<Checkup[] | null>(null);
  const [link, setLink] = useState<LinkCode | null>(null);
  const [watch, setWatch] = useState<LinkStatus | null>(null);
  const [sheet, setSheet] = useState<GuestExtra | null>(extras[0] ?? null);
  const [queue, setQueue] = useState<GuestExtra[]>(extras.slice(1));
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // what the shown result was made from, to tell whether 결과 업데이트 would add anything
  const [usedKey, setUsedKey] = useState('');

  // the first result: quiz only (state is set only after the request returns)
  const loadFirst = useCallback(
    () =>
      guestResult(answers, null, null).then(
        (r) => {
          setReport(r);
          setUsedKey(JSON.stringify([null, null]));
        },
        (e) => setError(e instanceof Error ? e.message : String(e)),
      ),
    [answers],
  );
  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  // the guest's watch link (server memory, 2 h): read every few seconds so new syncs show up
  useEffect(() => {
    if (!link) return;
    let stop = false;
    const read = () =>
      guestLinkStatus(link.linkId)
        .then((s) => !stop && setWatch(s))
        .catch(() => undefined);
    void read();
    const t = setInterval(read, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [link]);

  // leaving the page loses the result: the browser asks first
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const days = watch?.linked ? windowDays(watch.days) : [];
  const watchToSend = days.length ? days : null;
  const checkupToSend = checkups?.length ? checkups : null;
  const nowKey = JSON.stringify([checkupToSend, watchToSend]);
  const canUpdate = Boolean(report) && nowKey !== usedKey && Boolean(checkupToSend || watchToSend);

  async function update() {
    if (!report || updating) return;
    setUpdating(true);
    void Swal.fire({ title: '결과를 업데이트하고 있어요', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    try {
      const next = await guestResult(answers, checkupToSend, watchToSend);
      setPrevious(report);
      setReport(next);
      setUsedKey(nowKey);
      const unused: string[] = [];
      if (checkupToSend && !next.usedSources.includes('검진')) unused.push('검진 데이터는 이번 결과 계산 조건에 맞지 않아 반영되지 않았습니다.');
      if (watchToSend && !next.usedSources.includes('워치')) unused.push('워치 데이터는 이번 결과 계산 조건(최근 7일 중 4일 이상)에 맞지 않아 반영되지 않았습니다.');
      setNotice([`${next.usedSourcesLabel} 데이터로 결과를 업데이트했습니다.`, ...unused].join(' '));
      Swal.close();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      Swal.close();
      await showError('업데이트하지 못했습니다', e);
    } finally {
      setUpdating(false);
    }
  }

  async function close() {
    if (await confirmAction('결과 페이지를 닫을까요?', '로그인하지 않은 결과는 저장되지 않아 닫으면 다시 볼 수 없습니다.', '닫기')) router.push('/');
  }

  async function restart() {
    if (await confirmAction('퀴즈를 다시 할까요?', '지금 결과는 저장되지 않아 사라집니다.', '다시 하기')) onRestart();
  }

  function closeSheet() {
    setSheet(queue[0] ?? null);
    setQueue(queue.slice(1));
  }

  if (!report) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#f8f7f2] px-6 text-center font-sans text-[#3b3b3b]">
        {error ? (
          <>
            <p className="text-base text-[#777]">결과를 만들지 못했습니다.</p>
            <button type="button" onClick={() => {
                setError(null);
                void loadFirst();
              }} className="min-h-[56px] w-full max-w-[320px] rounded-[20px] bg-[#a9dfbd] px-5 font-semibold">
              다시 시도
            </button>
          </>
        ) : (
          <p className="text-base text-[#777]">결과를 만드는 중…</p>
        )}
      </main>
    );
  }

  const box = (
    <section data-pdf-hide className={`rounded-2xl px-5 py-4 text-sm ${canUpdate ? 'border border-[#a9dfbd] bg-[#eef8f1]' : 'bg-white/75'}`}>
      <p className="font-medium text-[#3b3b3b]">데이터 추가</p>
      <p className="mt-1 text-xs text-[#85847e]">로그인하지 않은 상태입니다. 연결한 데이터와 결과는 이 화면에서만 사용되고 저장되지 않습니다.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setSheet('checkup')} className="rounded-xl bg-white px-4 py-2 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">
          검진 연결
        </button>
        <button type="button" onClick={() => setSheet('watch')} className="rounded-xl bg-white px-4 py-2 font-semibold text-[#3d7a55] hover:bg-[#f2f1ec]">
          워치 연결
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-1.5 text-[#5f5e58]">
        <li>• 건강검진: {checkups == null ? '연결 안 함' : checkups.length ? `${checkups.map((c) => c.year).filter(Boolean).join(', ')}년 검진 결과 받음` : '조회된 검진 기록 없음'}</li>
        <li>• 워치: {!link ? '연결 안 함' : !watch?.linked ? '앱 연결을 기다리는 중' : `최근 7일 중 ${days.length}일 데이터 (삼성 헬스)`}</li>
      </ul>
      <button
        type="button"
        onClick={() => void update()}
        disabled={updating || !canUpdate}
        className={`mt-4 rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${canUpdate ? 'bg-[#55aa7a] text-white hover:bg-[#3d7a55]' : 'bg-[#ecebe6] text-[#3b3b3b]'}`}
      >
        {updating ? '업데이트 중…' : '결과 업데이트'}
      </button>
      {!canUpdate && <p className="mt-2 text-xs text-[#85847e]">새로 반영할 데이터가 없어요. 검진이나 워치를 연결하면 업데이트할 수 있어요.</p>}
    </section>
  );

  return (
    <>
      <ReportView report={report} previous={previous} updatedNotice={notice} onRestart={() => void restart()} onClose={() => void close()} guestBox={box} />
      {sheet && (
        <GuestSheet onClose={closeSheet}>
          {sheet === 'checkup' ? (
            <GuestCheckup checkups={checkups} onDone={setCheckups} />
          ) : (
            <GuestWatch link={link} status={watch} days={days.length} onLink={setLink} />
          )}
        </GuestSheet>
      )}
    </>
  );
}

function GuestSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[28px] bg-[#f8f7f2] sm:rounded-[28px]">
        <div className="flex justify-end p-3 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#5f5e58] hover:bg-white">
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

const field = 'mt-2 min-h-[50px] w-full rounded-2xl border border-[#d2d1cc] bg-white px-4 py-3 text-[15px] text-[#3b3b3b] outline-none focus:border-[#82c99c] focus:ring-2 focus:ring-[#82c99c]/20';
const LOGIN_ORGS: { value: LoginOrg; label: string }[] = [
  { value: 'kakao', label: '카카오톡' },
  { value: 'naver', label: '네이버' },
  { value: 'pass', label: 'PASS' },
  { value: 'toss', label: '토스' },
  { value: 'payco', label: '페이코' },
  { value: 'kica', label: '삼성패스' },
  { value: 'kb', label: 'KB스타뱅킹' },
  { value: 'shinhan', label: '신한은행' },
];
const CARRIERS: { value: Carrier; label: string }[] = [
  { value: 'S', label: 'SKT' },
  { value: 'K', label: 'KT' },
  { value: 'L', label: 'LG U+' },
];

function validBirth(v: string): boolean {
  if (!/^\d{8}$/.test(v)) return false;
  const d = new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.getMonth() + 1 === Number(v.slice(4, 6)) && d <= new Date() && Number(v.slice(0, 4)) >= 1900;
}

// NHIS lookup for a guest: the years come back to this page only (the backend saves nothing).
function GuestCheckup({ checkups, onDone }: { checkups: Checkup[] | null; onDone: (c: Checkup[]) => void }) {
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [loginOrg, setLoginOrg] = useState<LoginOrg>('kakao');
  const [carrier, setCarrier] = useState<Carrier>('S');
  const [consent, setConsent] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [again, setAgain] = useState(false);
  const orgLabel = LOGIN_ORGS.find((o) => o.value === loginOrg)?.label;
  const phoneDigits = phone.replace(/\D/g, '');
  const ok = consent && name.trim() && validBirth(birth) && /^01\d{8,9}$/.test(phoneDigits);

  async function lookup() {
    setWaiting(true);
    try {
      const res = await guestNhisLookup({ name: name.trim(), birthDate: birth, phone: phoneDigits, loginOrg, carrier: loginOrg === 'pass' ? carrier : undefined });
      onDone(res.checkups);
      setAgain(false);
      await Swal.fire({
        icon: res.checkups.length ? 'success' : 'info',
        title: res.checkups.length ? '건강검진 결과를 받았습니다' : '조회된 건강검진 기록이 없습니다',
        text: res.checkups.length ? '시트를 닫고 결과 업데이트를 눌러 반영하세요.' : '검진 결과 없이도 설문 결과는 그대로 볼 수 있습니다.',
        confirmButtonText: '확인',
        confirmButtonColor: GREEN,
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      await showError('건강검진 결과를 불러오지 못했습니다', new Error(/[가-힣]/.test(m) ? m : '입력한 정보를 확인한 뒤 다시 시도해 주세요.'));
    } finally {
      setWaiting(false);
    }
  }

  return (
    <div>
      <h2 className="text-[24px] font-semibold tracking-[-.02em]">건강검진 결과 조회</h2>
      <p className="mt-2 text-[15px] leading-7 text-[#686860]">국민건강보험공단 건강검진 결과를 불러옵니다. 휴대폰에서 본인인증 요청을 승인해 주세요.</p>

      {checkups && !again ? (
        <div className="mt-6 rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-5 py-5 text-[15px] text-[#3d7a55]">
          {checkups.length ? `${checkups.map((c) => c.year).filter(Boolean).join(', ')}년 검진 결과를 받았습니다. 닫기 후 결과 업데이트를 눌러 주세요.` : '조회된 건강검진 기록이 없습니다.'}
          <button type="button" onClick={() => setAgain(true)} className="mt-3 block text-sm font-semibold underline underline-offset-4">
            다시 조회하기
          </button>
        </div>
      ) : waiting ? (
        <div className="mt-6 rounded-2xl border border-[#e9e7df] bg-white px-6 py-8 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#82c99c] border-t-transparent" />
          <p className="mt-5 text-[15px] leading-7 text-[#5f5e58]">
            휴대폰에서 <strong>{orgLabel}</strong> 앱을 열고 본인인증 요청을 승인해 주세요.
          </p>
          <p className="mt-2 text-sm text-[#85847e]">창을 닫지 말고 기다려 주세요. 최대 몇 분이 걸릴 수 있습니다.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-[14px] font-medium">
            이름 (건강보험공단 등록 기준)
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="text-[14px] font-medium">
            생년월일 (8자리)
            <input className={field} value={birth} onChange={(e) => setBirth(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="19900101" inputMode="numeric" />
          </label>
          <label className="text-[14px] font-medium">
            휴대폰 번호
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" inputMode="numeric" autoComplete="tel" />
          </label>
          <label className="text-[14px] font-medium">
            본인인증 앱
            <select className={field} value={loginOrg} onChange={(e) => setLoginOrg(e.target.value as LoginOrg)}>
              {LOGIN_ORGS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {loginOrg === 'pass' && (
            <label className="text-[14px] font-medium">
              통신사
              <select className={field} value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
                {CARRIERS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-start gap-3 rounded-2xl border border-[#e9e7df] bg-white px-4 py-4 text-[14px] leading-7 text-[#5f5e58] sm:col-span-2">
            <input type="checkbox" className="mt-1.5 size-5 shrink-0 accent-[#55aa7a]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              이름, 생년월일, 휴대폰 번호를 하이픈에 전송해 건강검진 결과를 조회하는 데 동의합니다. 로그인하지 않은 상태이므로 검진 결과는 저장되지 않고 이 화면의 결과 계산에만 사용됩니다. 의학적 진단 목적으로 사용하지 않습니다.
            </span>
          </label>
          <button
            type="button"
            onClick={() => void lookup()}
            disabled={!ok}
            className="min-h-[60px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[17px] font-semibold transition-colors hover:bg-[#91d3aa] disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#999] sm:col-span-2"
          >
            본인인증 요청 보내기
          </button>
        </div>
      )}
    </div>
  );
}

// Watch for a guest: a link code for the iink app; the synced days stay in the server's memory (2 h) and this page.
function GuestWatch({ link, status, days, onLink }: { link: LinkCode | null; status: LinkStatus | null; days: number; onLink: (l: LinkCode) => void }) {
  const [busy, setBusy] = useState(false);
  async function newCode() {
    setBusy(true);
    try {
      onLink(await guestLinkCode());
    } catch (e) {
      await showError('연결 코드를 받지 못했습니다', e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h2 className="text-[24px] font-semibold tracking-[-.02em]">워치 데이터 연결</h2>
      <p className="mt-2 text-[15px] leading-7 text-[#686860]">
        iink 앱(Android)에서 갤럭시 워치의 삼성 헬스 데이터를 보내 주세요. 로그인하지 않은 상태이므로 데이터는 저장되지 않고 이 화면의 결과 계산에만 사용됩니다.
      </p>
      <a href="/app/iink.apk?v=1.0.17" download="iink-1.0.17.apk" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#cfe8d8] bg-white px-4 text-sm font-semibold text-[#3d7a55] hover:bg-[#eef8f1]">
        앱 다운로드
      </a>
      {!link ? (
        <button type="button" onClick={() => void newCode()} disabled={busy} className="mt-6 min-h-[60px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[17px] font-semibold hover:bg-[#91d3aa] disabled:opacity-50">
          {busy ? '연결 코드 준비 중…' : '연결 코드 받기'}
        </button>
      ) : !status?.linked ? (
        <div className="mt-6 rounded-[24px] border border-[#cfe8d8] bg-[#eef8f1] px-5 py-6 text-center">
          <p className="text-[15px] font-medium text-[#3d7a55]">iink 앱에 아래 연결 코드를 입력하세요</p>
          <p className="my-4 inline-flex min-h-[72px] items-center rounded-2xl border border-[#cfe8d8] bg-white px-6 font-mono text-4xl font-bold tracking-[.24em] text-[#3d7a55]">{link.code}</p>
          <p className="text-sm text-[#686860]">{new Date(link.expiresAt).toLocaleTimeString('ko-KR')}까지 유효 · 앱 연결을 기다리는 중…</p>
          <button type="button" onClick={() => void newCode()} disabled={busy} className="mt-4 min-h-11 rounded-full border border-[#a9dfbd] bg-white px-5 text-sm font-semibold text-[#3d7a55] disabled:opacity-50">
            새 코드 받기
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-5 py-5 text-[15px] leading-7 text-[#3d7a55]">
          <p className="font-semibold">✓ 앱이 연결되었습니다</p>
          <p>마지막 동기화: {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('ko-KR') : '아직 없음'}</p>
          <p>최근 7일 중 {days}일의 삼성 헬스 데이터가 있습니다. 결과에는 항목별로 7일 중 4일 이상 있을 때만 반영됩니다.</p>
          {days > 0 && <p className="mt-2 text-sm">닫기 후 결과 업데이트를 눌러 반영하세요.</p>}
        </div>
      )}
    </div>
  );
}
