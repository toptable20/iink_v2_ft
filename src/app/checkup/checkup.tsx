'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/auth';
import { lookupCheckups, type Carrier, type CheckupItem, type CompleteResult, type LoginOrg } from '@/lib/nhis';
import { UpdateResultPrompt } from '../update-result-prompt';
import { Card } from '../ui';

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

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// Every item field exactly as Hyphen sends it (in0002000432), with the spec's own names.
const ITEM_COLUMNS: { key: keyof CheckupItem; label: string }[] = [
  { key: 'type', label: '구분' },
  { key: 'targetDis', label: '목표질환' },
  { key: 'inspectItem', label: '검사항목' },
  { key: 'div', label: '분류' },
  { key: 'result', label: '결과' },
  { key: 'unit', label: '단위' },
  { key: 'normalA', label: '정상(A)' },
  { key: 'normalB', label: '정상(B)' },
  { key: 'suspicionDis', label: '질환의심' },
];

const input = 'mt-2 min-h-[54px] w-full rounded-2xl border border-[#d2d1cc] bg-white px-4 py-3 text-[15px] text-[#3b3b3b] outline-none transition focus:border-[#82c99c] focus:ring-2 focus:ring-[#82c99c]/20';

function OptionPicker<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={pickerRef} className="relative">
      <span className="block text-[14px] font-medium text-[#3b3b3b] sm:text-[15px]">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((current) => !current)}
        className={`${input} flex items-center justify-between gap-3 text-left`}
      >
        <span>{selected?.label}</span>
        <svg viewBox="0 0 20 20" fill="none" className={`h-5 w-5 shrink-0 text-[#718174] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label={`${label} 선택 닫기`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-[#252e28]/25 sm:hidden"
          />
          <div className="fixed inset-x-2 bottom-2 z-50 rounded-[22px] border border-[#e6e6df] bg-white p-3 shadow-[0_18px_50px_rgba(39,55,44,.18)] sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-1 sm:max-h-72 sm:overflow-y-auto sm:rounded-2xl sm:p-1.5">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e6e6df] sm:hidden" aria-hidden="true" />
            <p className="px-3 pb-2 text-sm font-semibold text-[#3b3b3b] sm:hidden">{label} 선택</p>
            <div id={`${id}-options`} role="listbox" aria-label={label} className="max-h-[70dvh] overflow-y-auto sm:max-h-none">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left text-[16px] transition-colors ${option.value === value ? 'bg-[#eef8f1] font-semibold text-[#3d7a55]' : 'text-[#3b3b3b] hover:bg-[#f5f7f3]'}`}
                >
                  {option.label}
                  {option.value === value && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function isValidBirthDate(year: string, month: string, day: string): boolean {
  if (year.length !== 4 || month.length < 1 || day.length < 1) return false;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (y < 1900 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && date <= today;
}

function koreanLookupError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/[가-힣]/.test(message)) return message;
  if (message.startsWith('Cannot reach the iink server')) {
    return '서버에 연결할 수 없습니다. 서버 상태와 네트워크를 확인한 뒤 다시 시도해 주세요.';
  }
  return '건강검진 결과를 불러오지 못했습니다. 입력한 정보를 확인한 뒤 다시 시도해 주세요.';
}

// Seconds since the lookup started, for the console diagnostics. Outside the component so the React
// purity lint rule does not mistake the clock read for a render-time call.
function startTimer(): () => string {
  const started = performance.now();
  return () => `${((performance.now() - started) / 1000).toFixed(1)}s`;
}

export function CheckupLookup() {
  const session = useSession();
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const monthInputRef = useRef<HTMLInputElement>(null);
  const dayInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'years' | 'months' | 'days'>('years');
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [phone, setPhone] = useState('');
  const [loginOrg, setLoginOrg] = useState<LoginOrg>('kakao');
  const [carrier, setCarrier] = useState<Carrier>('S');
  const [consent, setConsent] = useState(false);

  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  async function lookup() {
    setWaiting(true);
    setError(null);
    const seconds = startTimer();
    // Diagnostics in the browser console (F12). Masked: no full name, phone or birth date.
    console.info('[checkup] sending', {
      api: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
      loginOrg,
      carrier: loginOrg === 'pass' ? carrier : undefined,
      name: { length: [...name.trim()].length, hangulOnly: /^[가-힣]+$/.test(name.trim()), hasSpace: /\s/.test(name.trim()) },
      birthYear: birthDate.slice(0, 4),
      phone: { digits: phone.replace(/\D/g, '').length, last4: phone.replace(/\D/g, '').slice(-4) },
    });
    try {
      const res = await lookupCheckups({
        name,
        birthDate: birthDate.replace(/-/g, ''),
        phone,
        loginOrg,
        carrier: loginOrg === 'pass' ? carrier : undefined,
      });
      console.info(`[checkup] ok after ${seconds()}`, {
        mode: res.mode,
        checkups: res.checkups.map((c) => ({ year: c.year, items: c.chkResult?.length ?? 0, verdict: !!c.result })),
      });
      setResult(res);
    } catch (e) {
      console.error(`[checkup] failed after ${seconds()}:`, (e as Error).message);
      setError(koreanLookupError(e));
    } finally {
      setWaiting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  const orgLabel = LOGIN_ORGS.find((o) => o.value === loginOrg)?.label;
  const birthDateIsValid = isValidBirthDate(birthYear, birthMonth, birthDay);
  const birthDate = birthDateIsValid
    ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    : '';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const yearPageStart = 1900 + Math.floor((calendarYear - 1900) / 12) * 12;
  const calendarDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarOffset = new Date(calendarYear, calendarMonth, 1).getDay();

  useEffect(() => {
    if (!calendarOpen) return;
    function closeCalendar(event: MouseEvent) {
      if (event.target instanceof Node && !calendarRef.current?.contains(event.target)) setCalendarOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setCalendarOpen(false);
    }
    document.addEventListener('mousedown', closeCalendar);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeCalendar);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [calendarOpen]);

  function updateBirthPart(value: string, setter: (value: string) => void, maxLength: number, next?: React.RefObject<HTMLInputElement | null>) {
    const digits = value.replace(/\D/g, '').slice(0, maxLength);
    setter(digits);
    if (digits.length === maxLength) next?.current?.focus();
  }

  function openCalendar() {
    const hasDate = isValidBirthDate(birthYear, birthMonth, birthDay);
    setCalendarYear(hasDate ? Number(birthYear) : currentYear);
    setCalendarMonth(hasDate ? Number(birthMonth) - 1 : currentMonth);
    setCalendarView(hasDate ? 'days' : 'years');
    setCalendarOpen(true);
  }

  function chooseCalendarDay(day: number) {
    setBirthYear(String(calendarYear));
    setBirthMonth(String(calendarMonth + 1).padStart(2, '0'));
    setBirthDay(String(day).padStart(2, '0'));
    setCalendarOpen(false);
  }

  function changeCalendarMonth(offset: number) {
    const next = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarYear(next.getFullYear());
    setCalendarMonth(next.getMonth());
  }

  return (
    <Card className="max-w-[900px] border border-[#e9e7df] bg-[#fbfaf7]">
      <p className="text-xs font-semibold tracking-[.16em] text-[#55aa7a]">건강 정보 연동</p>
      <h1 className="mt-3 text-[28px] font-semibold tracking-[-.03em] text-[#3b3b3b] sm:text-[34px]">건강검진 결과 조회</h1>
      <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#686860] sm:text-base">
        국민건강보험공단(NHIS)의 건강검진 결과를 안전하게 불러옵니다. 휴대폰에서 본인인증 요청을 승인해 주세요. NHIS 로그인 정보는 저장되거나 저희에게 전달되지 않습니다.
      </p>

      {!session && (
        <p className="mt-7 rounded-2xl border border-[#e9e7df] bg-white px-5 py-4 text-[15px] leading-relaxed text-[#5f5e58] sm:text-base">
          검진 결과를 조회하고 계정에 저장하려면{' '}
          <Link href="/login" className="font-semibold text-[#3d7a55] underline underline-offset-4">
            로그인
          </Link>{' '}
          해 주세요. 조회 결과는 로그인한 계정에 저장됩니다.
        </p>
      )}

      {session && !waiting && !result && (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <label className="block text-[14px] font-medium text-[#3b3b3b] sm:text-[15px]">
            이름 (건강보험공단 등록 기준)
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="text-[14px] font-medium text-[#3b3b3b] sm:text-[15px]">생년월일</legend>
            <div className="mt-2 grid w-full max-w-[350px] grid-cols-[minmax(0,1.2fr)_minmax(0,.85fr)_minmax(0,.85fr)_44px] gap-2">
              <label className="flex min-h-[48px] min-w-0 items-center rounded-xl border border-[#d2d1cc] bg-white px-2.5 transition focus-within:border-[#82c99c] focus-within:ring-2 focus-within:ring-[#82c99c]/20 sm:px-3">
                <span className="sr-only">출생 연도</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-year"
                  aria-label="출생 연도"
                  placeholder="YYYY"
                  maxLength={4}
                  value={birthYear}
                  onChange={(e) => updateBirthPart(e.target.value, setBirthYear, 4, monthInputRef)}
                  className="w-full min-w-0 bg-transparent text-center text-[15px] font-semibold tabular-nums tracking-wide text-[#3b3b3b] outline-none placeholder:font-normal placeholder:text-[#b3b2aa] sm:text-base"
                />
                <span className="shrink-0 text-xs text-[#85847e]">년</span>
              </label>
              <label className="flex min-h-[48px] min-w-0 items-center rounded-xl border border-[#d2d1cc] bg-white px-2.5 transition focus-within:border-[#82c99c] focus-within:ring-2 focus-within:ring-[#82c99c]/20 sm:px-3">
                <span className="sr-only">출생 월</span>
                <input
                  ref={monthInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-month"
                  aria-label="출생 월"
                  placeholder="MM"
                  maxLength={2}
                  value={birthMonth}
                  onChange={(e) => updateBirthPart(e.target.value, setBirthMonth, 2, dayInputRef)}
                  className="w-full min-w-0 bg-transparent text-center text-[15px] font-semibold tabular-nums tracking-wide text-[#3b3b3b] outline-none placeholder:font-normal placeholder:text-[#b3b2aa] sm:text-base"
                />
                <span className="shrink-0 text-xs text-[#85847e]">월</span>
              </label>
              <label className="flex min-h-[48px] min-w-0 items-center rounded-xl border border-[#d2d1cc] bg-white px-2.5 transition focus-within:border-[#82c99c] focus-within:ring-2 focus-within:ring-[#82c99c]/20 sm:px-3">
                <span className="sr-only">출생 일</span>
                <input
                  ref={dayInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-day"
                  aria-label="출생 일"
                  placeholder="DD"
                  maxLength={2}
                  value={birthDay}
                  onChange={(e) => updateBirthPart(e.target.value, setBirthDay, 2)}
                  className="w-full min-w-0 bg-transparent text-center text-[15px] font-semibold tabular-nums tracking-wide text-[#3b3b3b] outline-none placeholder:font-normal placeholder:text-[#b3b2aa] sm:text-base"
                />
                <span className="shrink-0 text-xs text-[#85847e]">일</span>
              </label>
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={openCalendar}
                  aria-label="달력에서 생년월일 선택"
                  aria-expanded={calendarOpen}
                  aria-controls="checkup-birthday-calendar"
                  className="grid min-h-[48px] w-11 place-items-center rounded-xl border border-[#d2d1cc] bg-white text-[#4d805b] transition hover:border-[#82c99c] hover:bg-[#eef8f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#82c99c]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M7.5 3.5v3M16.5 3.5v3M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </button>
                {calendarOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="달력 닫기"
                      onClick={() => setCalendarOpen(false)}
                      className="fixed inset-0 z-40 bg-[#252e28]/25 sm:hidden"
                    />
                    <div
                      id="checkup-birthday-calendar"
                      role="dialog"
                      aria-modal="true"
                      aria-label="생년월일 선택 달력"
                      className="fixed inset-x-2 bottom-2 z-50 max-h-[80dvh] overflow-y-auto rounded-[22px] border border-[#e6e6df] bg-white p-3 shadow-[0_18px_50px_rgba(39,55,44,.18)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[300px] sm:max-w-[calc(100vw-3rem)] sm:overflow-visible sm:p-4"
                    >
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e6e6df] sm:hidden" aria-hidden="true" />
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {calendarView === 'years' ? (
                          <span className="px-2 text-sm font-semibold text-[#3b3b3b]">출생 연도</span>
                        ) : calendarView === 'months' ? (
                          <button type="button" onClick={() => setCalendarView('years')} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[#3b3b3b] hover:bg-[#f3f7f2]">
                            {calendarYear}년
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={() => setCalendarView('months')} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[#3b3b3b] hover:bg-[#f3f7f2]">
                              {MONTHS[calendarMonth]}
                            </button>
                            <button type="button" onClick={() => setCalendarView('years')} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[#3b3b3b] hover:bg-[#f3f7f2]">
                              {calendarYear}년
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="이전 기간"
                          disabled={calendarView === 'years' ? yearPageStart <= 1900 : calendarView === 'months' ? calendarYear <= 1900 : calendarYear <= 1900 && calendarMonth === 0}
                          onClick={() => {
                            if (calendarView === 'years') setCalendarYear(Math.max(1900, yearPageStart - 12));
                            else if (calendarView === 'months') setCalendarYear((year) => Math.max(1900, year - 1));
                            else changeCalendarMonth(-1);
                          }}
                          className="grid size-10 place-items-center rounded-full text-[#5f6f61] transition hover:bg-[#eef8f1] disabled:cursor-not-allowed disabled:opacity-30 sm:size-8"
                        >
                          <span aria-hidden="true">‹</span>
                        </button>
                        <button
                          type="button"
                          aria-label="다음 기간"
                          disabled={calendarView === 'years' ? yearPageStart + 12 > currentYear : calendarView === 'months' ? calendarYear >= currentYear : calendarYear >= currentYear && calendarMonth >= currentMonth}
                          onClick={() => {
                            if (calendarView === 'years') setCalendarYear(Math.min(currentYear, yearPageStart + 12));
                            else if (calendarView === 'months') setCalendarYear((year) => Math.min(currentYear, year + 1));
                            else changeCalendarMonth(1);
                          }}
                          className="grid size-10 place-items-center rounded-full text-[#5f6f61] transition hover:bg-[#eef8f1] disabled:cursor-not-allowed disabled:opacity-30 sm:size-8"
                        >
                          <span aria-hidden="true">›</span>
                        </button>
                      </div>
                    </div>

                    {calendarView === 'years' ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {Array.from({ length: 12 }, (_, index) => yearPageStart + index).map((year) => (
                          <button
                            key={year}
                            type="button"
                            disabled={year > currentYear}
                            onClick={() => {
                              setCalendarYear(year);
                              setCalendarView('months');
                            }}
                            className={`min-h-11 rounded-xl text-sm font-medium transition disabled:cursor-not-allowed disabled:text-[#c8c8c2] sm:min-h-10 ${year === Number(birthYear) ? 'bg-[#a9dfbd] text-[#2f4835]' : 'text-[#4b554d] hover:bg-[#eef8f1]'}`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    ) : calendarView === 'months' ? (
                      <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map((month, index) => {
                          const disabled = calendarYear === currentYear && index > currentMonth;
                          return (
                            <button
                              key={month}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setCalendarMonth(index);
                                setCalendarView('days');
                              }}
                              className={`min-h-11 rounded-xl text-sm font-medium transition disabled:cursor-not-allowed disabled:text-[#c8c8c2] ${index === Number(birthMonth) - 1 && calendarYear === Number(birthYear) ? 'bg-[#a9dfbd] text-[#2f4835]' : 'text-[#4b554d] hover:bg-[#eef8f1]'}`}
                            >
                              {month}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-[#92928a]">
                          {WEEKDAYS.map((weekday) => <span key={weekday} className="py-2">{weekday}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-y-1 text-center">
                          {Array.from({ length: calendarOffset }, (_, index) => <span key={`blank-${index}`} />)}
                          {Array.from({ length: calendarDays }, (_, index) => index + 1).map((day) => {
                            const isFuture = new Date(calendarYear, calendarMonth, day) > new Date(currentYear, currentMonth, new Date().getDate());
                            const isSelected = calendarYear === Number(birthYear) && calendarMonth === Number(birthMonth) - 1 && day === Number(birthDay);
                            return (
                              <button
                                key={day}
                                type="button"
                                disabled={isFuture}
                                onClick={() => chooseCalendarDay(day)}
                                className={`mx-auto grid size-10 place-items-center rounded-full text-sm transition disabled:cursor-not-allowed disabled:text-[#c8c8c2] sm:size-9 ${isSelected ? 'bg-[#a9dfbd] font-semibold text-[#2f4835]' : 'text-[#4b554d] hover:bg-[#eef8f1]'}`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <span className={`mt-1.5 block text-xs font-normal ${birthYear.length === 4 && birthMonth && birthDay && !birthDateIsValid ? 'text-rose-600' : 'text-[#85847e]'}`}>
              {birthYear.length === 4 && birthMonth && birthDay && !birthDateIsValid
                ? '올바른 생년월일을 입력해 주세요.'
                : '연도 → 월 → 일 순서로 숫자를 입력해 주세요.'}
            </span>
          </fieldset>
          <label className="block text-[14px] font-medium text-[#3b3b3b] sm:text-[15px]">
            휴대폰 번호
            <input
              className={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              inputMode="numeric"
              autoComplete="tel"
            />
          </label>
          <OptionPicker id="verification-app" label="본인인증 앱" value={loginOrg} options={LOGIN_ORGS} onChange={setLoginOrg} />
          {loginOrg === 'pass' && (
            <OptionPicker id="carrier" label="통신사" value={carrier} options={CARRIERS} onChange={setCarrier} />
          )}
          <label className="flex items-start gap-3 rounded-2xl border border-[#e9e7df] bg-white px-4 py-4 text-[14px] leading-7 text-[#5f5e58] sm:col-span-2 sm:px-5">
            <input type="checkbox" className="mt-1.5 size-5 shrink-0 accent-[#55aa7a]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              이름, 생년월일, 휴대폰 번호를 하이픈에 전송해 건강검진 결과를 조회하는 데 동의합니다. 검진 결과는 건강 정보이며, 계정에 저장되어 맞춤 추천과 iink 서비스 개선에만 사용됩니다. 의학적 진단 목적으로 사용하지 않습니다. 이름, 생년월일, 휴대폰 번호는 저장되지 않습니다.
            </span>
          </label>
          <button
            type="button"
            onClick={lookup}
            disabled={!consent || !name || !birthDateIsValid || !phone}
            className="min-h-[64px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[17px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa] disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#999] sm:col-span-2"
          >
            본인인증 요청 보내기
          </button>
        </div>
      )}

      {waiting && (
        <div className="mt-7 rounded-2xl border border-[#e9e7df] bg-white px-6 py-8 text-center sm:px-10">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#82c99c] border-t-transparent" />
          <p className="mt-5 text-[15px] leading-7 text-[#5f5e58] sm:text-base">
            휴대폰에서 <strong>{orgLabel}</strong> 앱을 열고 본인인증 요청을 승인해 주세요.
            <br />
            승인하면 건강검진 결과가 여기에 표시됩니다.
          </p>
          <p className="mt-3 text-sm text-[#85847e]">페이지를 닫지 말고 기다려 주세요. 최대 몇 분이 걸릴 수 있습니다.</p>
        </div>
      )}

      {result && result.checkups.length === 0 && (
        // Approved in the app, but NHIS has no checkup record for this person. Nothing was saved.
        <div className="mt-7 rounded-2xl border border-[#e9e7df] bg-white px-6 py-7 sm:px-8" role="status">
          <p className="text-[17px] font-semibold text-[#3b3b3b]">조회된 건강검진 기록이 없습니다</p>
          <p className="mt-3 text-[15px] leading-7 text-[#5f5e58]">
            본인인증은 완료되었지만, 국민건강보험공단에 이 정보로 조회되는 건강검진 결과가 없습니다. 건강검진을 받은 적이 없거나 아직 결과가 등록되지 않았을 수 있습니다.
          </p>
          <p className="mt-2 text-[15px] leading-7 text-[#5f5e58]">건강검진 결과 없이도 스마트 퀴즈만으로 결과를 받을 수 있습니다.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/quiz"
              className="inline-flex min-h-[52px] items-center rounded-full bg-[#a9dfbd] px-6 text-[15px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa]"
            >
              퀴즈로 계속하기
            </Link>
            <button type="button" onClick={reset} className="min-h-[52px] rounded-full border border-[#a9dfbd] bg-white px-5 text-[15px] font-semibold text-[#3d7a55] transition-colors hover:bg-[#eef8f1]">
              정보 확인 후 다시 조회하기
            </button>
          </div>
        </div>
      )}

      {result && result.checkups.length > 0 && (
        <div className="mt-6">
          {result.savedId ? (
            <>
              <p className="text-sm text-[#85847e]">계정에 저장되었습니다.</p>
              <UpdateResultPrompt what="검진 결과" />
            </>
          ) : (
            <p className="text-sm text-red-700">결과를 저장하지 못했습니다. iink 팀에 문의해 주세요.</p>
          )}
          {result.checkups.map((checkup, i) => (
              <section key={`${checkup.year}-${i}`} className="mt-6">
                {/* Checkup-level fields as sent: 년도, 판정, 검진기관, 소견 */}
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm sm:text-base">
                  <dt className="text-[#85847e]">년도</dt>
                  <dd className="font-semibold">{checkup.year}</dd>
                  <dt className="text-[#85847e]">판정</dt>
                  <dd>{checkup.result}</dd>
                  <dt className="text-[#85847e]">검진기관</dt>
                  <dd>{checkup.chkAgency}</dd>
                  <dt className="text-[#85847e]">소견</dt>
                  <dd className="whitespace-pre-line">{checkup.opinion}</dd>
                </dl>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-[#cfe8d8] bg-white">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#dceee6] text-[#3d7a55]">
                      <tr>
                        {ITEM_COLUMNS.map((c) => (
                          <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9e7df]">
                      {(checkup.chkResult ?? []).map((item, j) => (
                        <tr key={j}>
                          {ITEM_COLUMNS.map((c) => (
                            <td key={c.key} className={`px-4 py-3 align-top leading-relaxed ${c.key === 'result' ? 'font-semibold' : ''}`}>
                              {item[c.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
          ))}
          <button type="button" onClick={reset} className="mt-7 min-h-[52px] rounded-full border border-[#a9dfbd] bg-white px-5 text-[15px] font-semibold text-[#3d7a55] transition-colors hover:bg-[#eef8f1]">
            다시 조회하기
          </button>
        </div>
      )}

      {error && <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-relaxed text-rose-700">{error}</p>}
    </Card>
  );
}
