'use client';

import { useEffect, useState } from 'react';
import { getPrintProgress, type PrintProgress, type SavedPrinter } from '@/lib/printer-proxy';
import { PrintPanel } from './print-panel';

// Print popup, laid out like TriD's print window (trid-fe printDialog): printer select -> LCD panel
// (도구: 원점 / 이동 / 압출 / 예열, 출력: progress). Tile colours = TriD's LCD (tool #F5FD87, printing #B4C2FA).
// DESIGN STAGE (Max, 2026-11-16): the LCD buttons that move / heat / pause the printer are shown but off. The installed
// Foodian proxy can only upload + start; commands need a proxy that talks to Moonraker directly (tested later).

type Page = 'select' | 'main' | 'tool' | 'home' | 'move' | 'extrusion' | 'preheat' | 'printing';
type Job = { printer: SavedPrinter; fileName: string; label: string };

const TOOL = '#F5FD87';
const PRINTING = '#B4C2FA';
const PATH: Record<Page, string> = {
  select: '프린터 선택',
  main: 'LCD 패널',
  tool: 'LCD 패널 > 도구',
  home: 'LCD 패널 > 도구 > 원점',
  move: 'LCD 패널 > 도구 > 이동',
  extrusion: 'LCD 패널 > 도구 > 압출',
  preheat: 'LCD 패널 > 도구 > 예열',
  printing: 'LCD 패널 > 출력',
};
const STATE_TEXT: Record<string, string> = {
  standby: '대기',
  printing: '출력 중',
  paused: '일시 정지',
  complete: '출력 완료',
  cancelled: '취소됨',
  error: '오류',
};

// One LCD key. `go` = navigation (works); otherwise a printer command (off in the design stage).
type Key = { label: string; sub?: string; go?: Page; blank?: boolean };

function KeyGrid({ keys, color, onGo }: { keys: Key[]; color: string; onGo: (p: Page) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
      {keys.map((k, i) =>
        k.blank ? (
          <div key={i} aria-hidden="true" />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => k.go && onGo(k.go)}
            disabled={!k.go}
            title={k.go ? undefined : '프린터 직접 연결 후 사용할 수 있습니다'}
            className="flex aspect-square flex-col items-center justify-center rounded-lg text-[#1D1D1B] transition enabled:hover:brightness-95 disabled:cursor-not-allowed"
            style={{ backgroundColor: color, opacity: k.go ? 1 : 0.55 }}
          >
            <span className="text-lg font-semibold sm:text-2xl">{k.label}</span>
            {k.sub && <span className="mt-1 text-[11px] sm:text-xs">{k.sub}</span>}
          </button>
        ),
      )}
    </div>
  );
}

const BACK_TOOL: Key = { label: '↩', sub: '뒤로', go: 'tool' };
const KEYS: Partial<Record<Page, Key[]>> = {
  tool: [
    { label: '⌂', sub: '원점', go: 'home' },
    { label: '✥', sub: '이동', go: 'move' },
    { label: '⇣', sub: '압출', go: 'extrusion' },
    { label: '℃', sub: '예열', go: 'preheat' },
    { blank: true, label: '' },
    { blank: true, label: '' },
    { blank: true, label: '' },
    { label: '↩', sub: '뒤로', go: 'main' },
  ],
  home: [
    { label: '⌂', sub: '전체' },
    { label: 'X' },
    { label: 'Y' },
    { label: 'Z' },
    { label: '⏻', sub: '모터 끄기' },
    { label: '⏻', sub: 'XY 끄기' },
    { blank: true, label: '' },
    BACK_TOOL,
  ],
  move: [
    { label: 'X+' },
    { label: 'Y+' },
    { label: 'Z+' },
    { label: '10', sub: 'mm' },
    { label: 'X−' },
    { label: 'Y−' },
    { label: 'Z−' },
    BACK_TOOL,
  ],
  extrusion: [
    { label: '⇣', sub: '넣기' },
    { blank: true, label: '' },
    { blank: true, label: '' },
    { label: '⇡', sub: '빼기' },
    { label: '1', sub: '압출기' },
    { label: '10', sub: 'mm' },
    { label: '»', sub: '보통' },
    BACK_TOOL,
  ],
  preheat: [
    { label: '+', sub: '올리기' },
    { blank: true, label: '' },
    { blank: true, label: '' },
    { label: '−', sub: '내리기' },
    { label: '1', sub: '압출기' },
    { label: '10', sub: '℃' },
    { label: '■', sub: '정지' },
    BACK_TOOL,
  ],
};

function Printing({ job }: { job: Job | null }) {
  const [p, setP] = useState<PrintProgress | 'unsupported' | 'offline' | null>(null);

  // TriD's status panel: ask the proxy every 2 s while this screen is open
  useEffect(() => {
    if (!job) return;
    let alive = true;
    const tick = async () => {
      const r = await getPrintProgress(job.printer.ip);
      if (alive) setP(r);
    };
    tick();
    const timer = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [job]);

  if (!job) return <p className="py-10 text-center text-sm text-[#85847e]">출력 중인 작업이 없습니다.</p>;
  const live = p && typeof p === 'object' ? p : null;
  // only count it as ours when the printer reports our file (TriD: an old "complete" is not this job)
  const ours = live && live.filename === job.fileName ? live : null;
  const pct = ours?.progress != null ? Math.round(ours.progress * 100) : null;

  return (
    <div className="rounded-lg p-4 sm:p-5" style={{ backgroundColor: PRINTING }}>
      <p className="text-xs text-[#1D1D1B]/70">{job.printer.name} · {job.printer.ip} · {job.label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#1D1D1B]">{job.fileName}</p>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full bg-[#0f1628] transition-all" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-[#1D1D1B]">
        <span>{ours?.state ? (STATE_TEXT[ours.state] ?? ours.state) : '대기 중'}</span>
        <span className="tabular-nums">{pct != null ? `${pct}%` : '-'}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#1D1D1B]">
        <div className="rounded-md bg-white/60 px-3 py-2">
          <dt className="text-[#1D1D1B]/60">레이어</dt>
          <dd className="tabular-nums">{ours?.currentLayer != null ? `${ours.currentLayer} / ${ours.totalLayer ?? '-'}` : '-'}</dd>
        </div>
        <div className="rounded-md bg-white/60 px-3 py-2">
          <dt className="text-[#1D1D1B]/60">온도</dt>
          <dd className="tabular-nums">
            {ours?.extruder?.temperature != null ? `${Math.round(ours.extruder.temperature)} / ${Math.round(ours.extruder.target ?? 0)} ℃` : '-'}
          </dd>
        </div>
      </dl>

      {p === 'unsupported' && (
        <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs leading-relaxed text-[#1D1D1B]">
          설치된 프록시는 출력 진행 상태를 지원하지 않습니다. 프린터 화면에서 확인해 주세요. (새 프록시에서 표시됩니다)
        </p>
      )}
      {p === 'offline' && <p className="mt-3 text-xs text-[#a33a3a]">프린터 상태를 불러오지 못했습니다.</p>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {['일시 정지', '정지', '옵션'].map((l) => (
          <button
            key={l}
            type="button"
            disabled
            title="프린터 직접 연결 후 사용할 수 있습니다"
            className="h-10 cursor-not-allowed rounded-lg bg-white/60 text-sm text-[#1D1D1B] opacity-60"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrintDialog({ resultId, title, onClose }: { resultId: string; title: string; onClose: () => void }) {
  const [page, setPage] = useState<Page>('select');
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  });

  function close() {
    if (job && !confirm('출력 창을 닫을까요? 출력은 프린터에서 계속됩니다.')) return;
    onClose();
  }

  const lcd = page !== 'select';
  const color = page === 'printing' ? PRINTING : TOOL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="프린터 출력">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative max-h-[calc(100vh-32px)] w-full max-w-[716px] overflow-y-auto rounded-xl border border-[#DFDFDF] bg-[#F5F5F5] shadow-[0_4px_12px_rgba(0,0,0,0.16)]">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-xs text-[#85847e]">{title}</p>
            <p className="text-base font-semibold text-[#1D1D1B] sm:text-lg">{PATH[page]}</p>
          </div>
          <button type="button" onClick={close} aria-label="닫기" className="grid size-9 place-items-center rounded-full text-xl text-[#5f5e58] hover:bg-black/5">
            ×
          </button>
        </div>

        {lcd && (
          <div className="mx-5 mt-3 flex gap-1 sm:mx-6">
            {(['main', 'printing'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`rounded-t-lg px-4 py-2 text-sm ${(p === 'main' ? page !== 'printing' : page === 'printing') ? 'bg-white font-semibold' : 'text-[#85847e]'}`}
              >
                {p === 'main' ? 'LCD 패널' : '출력 상태'}
              </button>
            ))}
            <button type="button" onClick={() => setPage('select')} className="ml-auto px-3 py-2 text-xs text-[#0d79ea] hover:underline">
              다른 출력
            </button>
          </div>
        )}

        <div className={`mx-5 mb-5 rounded-b-lg bg-white p-4 sm:mx-6 sm:mb-6 sm:p-6 ${lcd ? '' : 'mt-3 rounded-t-lg'}`}>
          {page === 'select' && (
            <PrintPanel
              resultId={resultId}
              onPrinted={(j) => {
                setJob(j);
                setPage('printing');
              }}
            />
          )}

          {page === 'main' && (
            <div className="grid grid-cols-2 gap-4 sm:mx-10 sm:my-6 sm:gap-8">
              {[
                { label: '도구', icon: '⚒', bg: TOOL, go: 'tool' as Page },
                { label: '출력', icon: '▤', bg: PRINTING, go: 'printing' as Page },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setPage(t.go)}
                  className="flex aspect-[172/208] flex-col items-center justify-center rounded-lg text-[#1D1D1B] transition hover:brightness-95"
                  style={{ backgroundColor: t.bg }}
                >
                  <span className="text-5xl sm:text-6xl">{t.icon}</span>
                  <span className="mt-3 text-lg sm:text-[22px]">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {KEYS[page] && <KeyGrid keys={KEYS[page]!} color={color} onGo={setPage} />}
          {page === 'printing' && <Printing job={job} />}

          {lcd && page !== 'main' && page !== 'printing' && (
            <p className="mt-4 text-center text-[11px] text-[#85847e]">
              흐리게 보이는 버튼은 프린터 직접 연결(새 프록시) 후 사용할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
