'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPrintGcode, type PrintGcode, type PrintMethod } from '@/lib/admin';
import {
  PROXY_BASE,
  PROXY_DOWNLOAD_URL,
  PROXY_OPEN_LINK,
  addPrinter,
  isPrinterAddress,
  isProxyRunning,
  listPrinters,
  printerStatus,
  removePrinter,
  sendToPrinter,
  type PrinterState,
  type SavedPrinter,
} from '@/lib/printer-proxy';

const LAST_PRINTER_KEY = 'iink_last_printer_ip';
const RETRY_MS = 2000;

const BADGE: Record<PrinterState, { text: string; cls: string }> = {
  checking: { text: '확인 중', cls: 'bg-[#f0eee8] text-[#85847e]' },
  idle: { text: '대기', cls: 'bg-[#e3f2e9] text-[#2f7a4f]' },
  busy: { text: '출력 중', cls: 'bg-[#fdf0d9] text-[#9a6a12]' },
  offline: { text: '오프라인', cls: 'bg-[#fbe3e3] text-[#a33a3a]' },
};

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_PRINTER_KEY);
  } catch {
    return null;
  }
}

// Print one result: iink printer proxy on this PC -> chosen printer. G-code comes from the backend (Foodian slicer).
// Used as the first screen of the print popup (print-dialog.tsx); onPrinted moves the popup to the LCD screens.
// The two G-code methods (backend print.service): both use the 품평회 모델링 파일 settings.
const METHODS: { id: PrintMethod; title: string; note: string }[] = [
  { id: 'model', title: '모델 출력', note: '푸디언 출력 합계로 모델 선택 (3g 미만 traditional_1 · 3–4g _2 · 4–5g _3 · 5–6g _4 · 6g 이상 _5), 인필 0%' },
  { id: 'infill', title: '인필 출력', note: 'iink_cylinder 모델, 데일리 밸런스 Level로 인필 밀도 (triangles · 1–2 40% · 3–4 35% · 5 30% · 6–7 25% · 8 20% · 9–10 15%)' },
];

// What was printed, for the message and the status screen: "traditional_1 · 1.8g" / "iink_cylinder · Level 7 · 인필 25%"
function printLabel(g: PrintGcode): string {
  const model = g.model.replace(/[.]stl$/, '');
  return g.method === 'infill' ? `${model} · 데일리 밸런스 Level ${g.dailyBalanceLevel} · 인필 ${g.infillDensity}%` : `${model} · ${g.inkTotalG}g`;
}

export function PrintPanel({
  resultId,
  onPrinted,
}: {
  resultId: string;
  onPrinted?: (job: { printer: SavedPrinter; fileName: string; label: string }) => void;
}) {
  const [proxyOk, setProxyOk] = useState<boolean | null>(null);
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);
  const [states, setStates] = useState<Record<string, PrinterState>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'slicing' | 'sending'>('idle');
  const [method, setMethod] = useState<PrintMethod>('model');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [opening, setOpening] = useState(false);
  const mounted = useRef(true);

  const check = useCallback(async (p: SavedPrinter, isRetry = false) => {
    setStates((s) => ({ ...s, [p.ip]: 'checking' }));
    let state = await printerStatus(p.ip);
    if (state === 'offline' && !isRetry) {
      // one quiet retry (Wi-Fi blips)
      await new Promise((r) => setTimeout(r, RETRY_MS));
      state = await printerStatus(p.ip);
    }
    if (!mounted.current) return;
    setStates((s) => ({ ...s, [p.ip]: state }));
    if (state === 'idle') setSelected((cur) => cur ?? (p.ip === readLast() ? p.ip : cur));
    else setSelected((cur) => (cur === p.ip ? null : cur));
  }, []);

  const loadPrinters = useCallback(async () => {
    try {
      const list = await listPrinters();
      if (!mounted.current) return;
      setPrinters(list);
      list.forEach((p) => check(p));
    } catch {
      setPrinters([]);
    }
  }, [check]);

  // TriD: check the proxy, then while it is off check every 2 s and whenever this window gets focus again
  // (the proxy may be started from the Start menu, the desktop or the 프록시 연결 button)
  useEffect(() => {
    mounted.current = true;
    let found = false;
    const check = async () => {
      if (found) return;
      const ok = await isProxyRunning();
      if (!mounted.current || found) return;
      setProxyOk(ok);
      if (ok) {
        found = true;
        clearInterval(timer);
        window.removeEventListener('focus', check);
        loadPrinters();
      }
    };
    const timer = setInterval(check, 2000);
    window.addEventListener('focus', check);
    check();
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, [loadPrinters]);

  // TriD "프록시 연결": open the installed proxy app by its link, then check every second for 10 s
  async function openProxy() {
    setOpening(true);
    window.location.href = PROXY_OPEN_LINK;
    for (let i = 0; i < 10 && mounted.current; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await isProxyRunning()) {
        if (!mounted.current) return;
        setProxyOk(true);
        loadPrinters();
        break;
      }
    }
    if (mounted.current) setOpening(false);
  }

  // TriD "프록시 다운로드": confirm, then download the installer
  function downloadProxy() {
    if (confirm('프린터 프록시 프로그램을 설치하시겠습니까?\n다운로드한 압축 파일을 풀고 설치 파일을 실행해 주세요.')) {
      window.open(PROXY_DOWNLOAD_URL, '_blank', 'noopener');
    }
  }

  async function onAdd() {
    const name = newName.trim();
    const ip = newIp.trim();
    if (!name) return setAddError('프린터 이름을 입력해 주세요.');
    if (!isPrinterAddress(ip)) return setAddError('같은 네트워크의 IP를 입력해 주세요. 예: 192.168.0.100');
    try {
      const list = await addPrinter(name, ip);
      setPrinters(list);
      setAdding(false);
      setNewName('');
      setNewIp('');
      setAddError(null);
      const added = list.find((p) => p.name === name);
      if (added) check(added);
    } catch (e) {
      setAddError((e as Error).message);
    }
  }

  async function onRemove(p: SavedPrinter) {
    if (!confirm(`${p.name} (${p.ip}) 프린터를 목록에서 삭제할까요?`)) return;
    try {
      setPrinters(await removePrinter(p.name));
      if (selected === p.ip) setSelected(null);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }

  async function onPrint() {
    const printer = printers.find((p) => p.ip === selected);
    if (!printer || step !== 'idle') return;
    setMessage(null);
    try {
      setStep('slicing');
      const made = await createPrintGcode(resultId, method);
      const { fileName, gcode } = made;
      const label = printLabel(made);
      setStep('sending');
      await sendToPrinter(printer.ip, fileName, gcode);
      try {
        localStorage.setItem(LAST_PRINTER_KEY, printer.ip);
      } catch {
        // storage blocked: only the auto-select next time is lost
      }
      setMessage({ ok: true, text: `${printer.name}에서 출력을 시작했습니다. (${label} · ${fileName})` });
      onPrinted?.({ printer, fileName, label });
      setStates((s) => ({ ...s, [printer.ip]: 'busy' }));
      setSelected(null);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
      check(printer, true);
    } finally {
      setStep('idle');
    }
  }

  const field = 'h-9 w-full rounded-lg border border-[#e9e7df] bg-white px-3 text-sm outline-none focus:border-[#0d79ea]';

  return (
    <div>

      {proxyOk === null ? (
        <p className="mt-3 text-sm text-[#85847e]">프록시 확인 중…</p>
      ) : !proxyOk ? (
        <div className="mt-3 rounded-xl bg-[#f8f7f2] p-3 text-sm leading-relaxed">
          <p className="font-medium text-[#a33a3a]">프린터 프록시가 켜져 있지 않습니다.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={openProxy}
              disabled={opening}
              className="h-9 flex-1 rounded-full bg-[#0f1628] text-xs font-semibold text-white disabled:opacity-50"
            >
              {opening ? '연결 중…' : '프록시 연결'}
            </button>
            <button type="button" onClick={downloadProxy} className="h-9 flex-1 rounded-full border border-[#e9e7df] bg-white text-xs font-semibold">
              프록시 다운로드
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#85847e]">
            실행 중인데도 연결되지 않으면{' '}
            <a href={`${PROXY_BASE}/health`} target="_blank" rel="noreferrer" className="text-[#0d79ea] underline">
              상태 확인 페이지
            </a>
            에서 &apos;고급&apos; → &apos;localhost(안전하지 않음)(으)로 이동&apos;을 눌러 주세요.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {printers.length === 0 && <li className="text-sm text-[#85847e]">등록된 프린터가 없습니다.</li>}
            {printers.map((p) => {
              const state = states[p.ip] ?? 'checking';
              const active = selected === p.ip;
              return (
                <li key={p.name}>
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${active ? 'border-[#0d79ea] bg-[#eef5fe]' : 'border-[#e9e7df]'}`}
                  >
                    <button
                      type="button"
                      disabled={state !== 'idle' || step !== 'idle'}
                      onClick={() => setSelected(p.ip)}
                      aria-pressed={active}
                      className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                    >
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-[#85847e] tabular-nums">{p.ip}</span>
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[state].cls}`}>{BADGE[state].text}</span>
                    <button type="button" onClick={() => check(p)} aria-label={`${p.name} 다시 확인`} className="px-1 text-sm text-[#85847e] hover:text-[#3b3b3b]">
                      ↻
                    </button>
                    <button type="button" onClick={() => onRemove(p)} aria-label={`${p.name} 삭제`} className="px-1 text-sm text-[#85847e] hover:text-[#a33a3a]">
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {adding ? (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#f8f7f2] p-3">
              <input className={field} placeholder="이름 (예: 매장 1)" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} />
              <input className={field} placeholder="IP (예: 192.168.0.100)" value={newIp} onChange={(e) => setNewIp(e.target.value)} inputMode="decimal" />
              {addError && <p className="text-xs text-[#a33a3a]">{addError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={onAdd} className="h-8 flex-1 rounded-full bg-[#0f1628] text-xs font-semibold text-white">
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setAddError(null);
                  }}
                  className="h-8 flex-1 rounded-full border border-[#e9e7df] bg-white text-xs"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="mt-3 text-xs font-semibold text-[#0d79ea] hover:underline">
              + 프린터 추가
            </button>
          )}

          <fieldset className="mt-4" disabled={step !== 'idle'}>
            <legend className="text-xs font-semibold text-[#3b3b3b]">출력 방식</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {METHODS.map((m) => (
                <label key={m.id} className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2 text-xs ${method === m.id ? 'border-[#0d79ea] bg-[#f2f8ff]' : 'border-[#e9e7df] bg-white'}`}>
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name="print-method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
                    {m.title}
                  </span>
                  <span className="mt-1 text-[11px] leading-relaxed text-[#85847e]">{m.note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={onPrint}
            disabled={!selected || step !== 'idle'}
            className="mt-4 h-11 w-full rounded-full bg-[#0d79ea] text-sm font-semibold text-white transition hover:bg-[#2788f0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 'slicing' ? 'G-code 만드는 중…' : step === 'sending' ? '프린터로 보내는 중…' : '출력하기'}
          </button>
          {!selected && step === 'idle' && <p className="mt-2 text-xs text-[#85847e]">대기 중인 프린터를 선택해 주세요.</p>}
        </>
      )}

      {message && (
        <p role="status" className={`mt-3 text-xs leading-relaxed ${message.ok ? 'text-[#2f7a4f]' : 'text-[#a33a3a]'}`}>
          {message.text}
        </p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-[#85847e]">
        출력 설정은 품평회 모델링 파일 기준입니다 (두 방식 모두 같은 설정, 인필만 다름).
      </p>
    </div>
  );
}
