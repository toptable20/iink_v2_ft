'use client';

import type { ReactNode } from 'react';
import type { SmartQuizResult } from '@/lib/smart-quiz';
import { usedDataLabel } from '@/lib/update-alert';

// Compares a result with the one made just before it (previousResultId) on screen: no new API, nothing saved.
// Each map holds the OLD value of what changed, so the report can mark the cell and show "이전 …" next to it.

const fmt = (n: number | null | undefined) => (n == null ? '–' : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

export interface ReportDiff {
  status: string | null;
  bmi: string | null;
  topics: Map<string, { level?: string; score?: string; sources?: string; stage?: string; confidence?: string }>;
  nutrients: Map<string, { isNew: boolean; need?: string; perServing?: string; supplied?: string }>;
  removedNutrients: string[];
  ink: Map<string, string>;
  inkTotal: string | null;
  product: Map<string, string>;
  sources: string | null;
  summary: string[];
}

export function diffReports(cur: SmartQuizResult, prev: SmartQuizResult): ReportDiff {
  const a = cur.result;
  const b = prev.result;
  const summary: string[] = [];

  const sources = same(usedDataLabel(cur.usedSources), usedDataLabel(prev.usedSources)) ? null : usedDataLabel(prev.usedSources);
  if (sources) summary.push(`사용한 데이터: ${sources} → ${usedDataLabel(cur.usedSources)}`);

  const status = same(a.status, b.status) ? null : b.status;
  if (status) summary.push(`출력 상태: ${b.status} → ${a.status}`);
  const bmi = same(a.bmi?.toFixed(1), b.bmi?.toFixed(1)) ? null : b.bmi == null ? '–' : b.bmi.toFixed(1);

  const topics: ReportDiff['topics'] = new Map();
  const before = new Map(b.topics.map((t) => [t.topic, t]));
  for (const t of a.topics) {
    const p = before.get(t.topic);
    if (!p) continue;
    const d: { level?: string; score?: string; sources?: string; stage?: string; confidence?: string } = {};
    if (!same(t.displayLevel, p.displayLevel)) d.level = p.displayLevel;
    if (!same(t.score, p.score)) d.score = fmt(p.score);
    if (!same(t.sourcesUsed, p.sourcesUsed)) d.sources = p.sourcesUsed || '–';
    if (!same(t.stage, p.stage)) d.stage = p.stage || '–';
    if (!same(t.confidence, p.confidence)) d.confidence = p.confidence || '–';
    if (Object.keys(d).length) topics.set(t.topic, d);
    if (d.level) summary.push(`${t.topic} Level ${p.displayLevel} → ${t.displayLevel}`);
  }

  const nutrients: ReportDiff['nutrients'] = new Map();
  const prevRows = new Map(b.topNutrientRows.map((n) => [n.name, n]));
  for (const n of a.topNutrientRows) {
    const p = prevRows.get(n.name);
    if (!p) {
      nutrients.set(n.name, { isNew: true });
      continue;
    }
    const d: { isNew: boolean; need?: string; perServing?: string; supplied?: string } = { isNew: false };
    if (!same(n.correctedNeed, p.correctedNeed)) d.need = fmt(p.correctedNeed);
    if (!same(n.perServing, p.perServing)) d.perServing = fmt(p.perServing);
    if (!same(n.suppliedText ?? n.supplied, p.suppliedText ?? p.supplied)) d.supplied = p.suppliedText ?? fmt(p.supplied);
    if (d.need || d.perServing || d.supplied) nutrients.set(n.name, d);
  }
  const curNames = new Set(a.topNutrientRows.map((n) => n.name));
  const removedNutrients = b.topNutrientRows.map((n) => n.name).filter((x) => !curNames.has(x));
  const added = a.topNutrientRows.filter((n) => nutrients.get(n.name)?.isNew).map((n) => n.name);
  if (added.length) summary.push(`영양소 Top 5에 추가: ${added.join(', ')}`);
  if (removedNutrients.length) summary.push(`영양소 Top 5에서 빠짐: ${removedNutrients.join(', ')}`);
  const amountChanged = [...nutrients].filter(([, d]) => !d.isNew).map(([name]) => name);
  if (amountChanged.length) summary.push(`영양소 양 변경: ${amountChanged.join(', ')}`);

  const ink = new Map<string, string>();
  const prevInk = new Map(b.ink.map((i) => [i.id, i.g]));
  for (const i of a.ink) if (prevInk.has(i.id) && !same(i.g, prevInk.get(i.id))) ink.set(i.id, fmt(prevInk.get(i.id)));
  const inkTotal = same(a.inkTotalG, b.inkTotalG) ? null : fmt(b.inkTotalG);
  if (inkTotal) summary.push(`푸디언 출력 합계: ${fmt(b.inkTotalG)} g → ${fmt(a.inkTotalG)} g`);

  const product = new Map<string, string>();
  const rows: [string, string, string][] = [
    ['현재 제공 제품', a.product.offered1, b.product.offered1],
    ['조합 제품', a.product.offered2, b.product.offered2],
    ['조합 여부', a.product.combined ? '조합' : '단일', b.product.combined ? '조합' : '단일'],
    ['28일 섭취 플랜', a.product.plan, b.product.plan],
    ['라인업 기준 추천(참고)', a.product.lineupText, b.product.lineupText],
  ];
  for (const [label, now, was] of rows) if (!same(now || '', was || '')) product.set(label, was || '–');
  if (product.has('28일 섭취 플랜')) summary.push(`28일 섭취 플랜: ${b.product.plan} → ${a.product.plan}`);
  else if (product.size) summary.push(`추천 제품 변경: ${[...product.keys()].join(', ')}`);

  return { status, bmi, topics, nutrients, removedNutrients, ink, inkTotal, product, sources, summary };
}

// A changed value: green and bold, with the old value small and grey after it.
export function Changed({ was, children }: { was: string | undefined | null; children: ReactNode }) {
  if (was == null) return <>{children}</>;
  return (
    <>
      <span className="font-bold text-[#2f8a57]">{children}</span>
      <span className="ml-1.5 whitespace-nowrap text-xs font-normal text-[#9b9b96]">(이전 {was})</span>
    </>
  );
}

export function NewTag() {
  return <span className="ml-1.5 rounded-full bg-[#55aa7a] px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">NEW</span>;
}

export const changedRow = 'bg-[#f1faf4]';

// Top of the report: what changed since the previous result, and the switch for the marks.
export function ChangeSummary({ diff, prevDate, on, onToggle }: { diff: ReportDiff; prevDate: string; on: boolean; onToggle: () => void }) {
  return (
    <section className="rounded-2xl border border-[#a9dfbd] bg-[#eef8f1] px-5 py-4 text-sm text-[#3b3b3b] sm:text-base">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[#3d7a55]">이전 결과({prevDate})와 달라진 점</p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onToggle}
          className="flex items-center gap-2 text-xs font-semibold text-[#3d7a55] sm:text-sm"
        >
          변경 표시
          <span className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-[#55aa7a]' : 'bg-[#cfcdc5]'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>
      {diff.summary.length ? (
        <ul className="mt-3 flex flex-col gap-1.5 leading-relaxed">
          {diff.summary.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-[#55aa7a]">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[#5f5e58]">이전 결과와 달라진 항목이 없습니다.</p>
      )}
      {on && diff.summary.length > 0 && (
        <p className="mt-3 text-xs text-[#5f7d68]">
          아래 표에서 바뀐 값은 <span className="font-bold text-[#2f8a57]">초록색 굵은 글씨</span>로, 이전 값은 옆에 회색으로 표시됩니다.
        </p>
      )}
    </section>
  );
}
