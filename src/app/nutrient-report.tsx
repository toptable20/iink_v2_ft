'use client';

import type { SmartQuizResult } from '@/lib/smart-quiz';

// User-side nutrient report, v1 look (team leader 2026-11-17: "V1 방식 섭취 리포트", "기존 디자인으로 V1").
// Design = v1 ProgressBar.vue: % inside the bar, pink #CE99C3 / green #7BC195.
//
// 1) 식사 섭취 지수: 주요 영양소 + 비타민 = the V9 intake index (24_설문영양소섭취지수 C, 0–100, from N01–N07).
//    Higher = eats the foods with that nutrient more often. Not % of the recommended amount (the sheet says so).
//    Pink at 50 or below, green above 50 (v1). Under the bar: the user's foods that add the most (engine sources).
// 2) 무기질 필요도: sheet 24 has no minerals (04_산식명세 step 14: "무기질은 섭취지수 없음"), so minerals show the
//    V9 need (42 보정 요구지수 × 100). Higher = more to supplement: orange #F2A65A above 50, blue #8FB8F0 at 50 or below.
//    Under the bar: daily target (42 최종 목표량) and the KDRI recommended amount (41).
// Each section has its own legend so the two colour rules never mix.

const PINK = '#CE99C3';
const GREEN = '#7BC195';
// mineral need bars use their own pair so they never read like the intake bars (Max 2026-11-17)
const ORANGE = '#F2A65A';
const BLUE = '#8FB8F0';

// 23_식품군영양성분 food group names of the questions in sheet 24
const FOOD: Record<string, string> = {
  N01: '채소류',
  N02: '과일',
  N03: '우유·유제품',
  N04: '생선류',
  N05: '콩·두부',
  N06: '견과류',
  N07: '전곡·잡곡류',
};

type IntakeItem = { label: string; key: string; engine?: string };

// key = the 24_설문영양소섭취지수 row name; engine = the nutrient name in the V9 config (older results kept only those)
const INTAKE_GROUPS: { title: string; items: IntakeItem[] }[] = [
  {
    title: '주요 영양소',
    items: [
      { label: '탄수화물', key: 'Carb g' },
      { label: '단백질', key: 'Protein g', engine: 'Protein' },
      { label: '지방', key: 'Fat g' },
      { label: '식이섬유', key: 'Fiber g', engine: 'Fiber' },
    ],
  },
  {
    title: '비타민',
    items: [
      { label: '비타민 A', key: 'Vit A ug RAE', engine: 'Vitamin A' },
      { label: '비타민 D', key: 'Vit D ug', engine: 'Vitamin D' },
      { label: '비타민 E', key: 'Vit E mg', engine: 'Vitamin E' },
      { label: '비타민 K', key: 'Vit K ug' },
      { label: '비타민 C', key: 'Vit C mg', engine: 'Vitamin C' },
      { label: '비타민 B1', key: 'B1 mg', engine: 'Thiamin B1' },
      { label: '비타민 B2', key: 'B2 mg', engine: 'Riboflavin B2' },
      { label: '나이아신 (B3)', key: 'Niacin mg', engine: 'Niacin' },
      { label: '판토텐산 (B5)', key: 'Pantothenic mg' },
      { label: '비타민 B6', key: 'B6 mg', engine: 'Vitamin B6' },
      { label: '비오틴 (B7)', key: 'Biotin ug' },
      { label: '엽산', key: 'Folate ug', engine: 'Folate' },
      { label: '비타민 B12', key: 'B12 ug', engine: 'Vitamin B12' },
    ],
  },
];

const MINERALS: { label: string; engine: string }[] = [
  { label: '칼슘', engine: 'Calcium' },
  { label: '마그네슘', engine: 'Magnesium' },
  { label: '철', engine: 'Iron' },
  { label: '아연', engine: 'Zinc' },
  { label: '셀레늄', engine: 'Selenium' },
];

const num = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });

function Bar({ label, value, color, note }: { label: string; value: number; color: (pct: number) => string; note?: string }) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className="flex items-start gap-3" aria-label={`${label} ${pct}%${note ? `, ${note}` : ''}`}>
      <span className="w-[35%] shrink-0 break-words text-[13px] leading-5 sm:text-base sm:leading-6">{label}</span>
      <div className="flex-1">
        <div className="relative h-5 rounded-[10px] bg-white ring-1 ring-[#ecebe6] sm:h-6">
          <div className="h-full rounded-[10px]" style={{ width: `${pct}%`, backgroundColor: color(pct) }} />
          <p className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] leading-normal sm:text-[13px]">
            {pct}
            <span className="text-[9px] sm:text-[11px]">%</span>
          </p>
        </div>
        {note && <p className="mt-1 break-keep text-xs text-[#5f5e58] sm:text-[13px]">{note}</p>}
      </div>
    </div>
  );
}

function Legend({ items }: { items: [color: string, text: string][] }) {
  return (
    <ul className="flex gap-4 text-xs text-[#5f5e58] sm:text-sm">
      {items.map(([color, text]) => (
        <li key={text} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Header({ title, legend, children }: { title: string; legend: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold sm:text-[20px]">{title}</h2>
        {legend}
      </div>
      <p className="mt-2 break-keep text-xs leading-relaxed text-[#85847e] sm:text-sm">{children}</p>
    </>
  );
}

const intakeColor = (pct: number) => (pct <= 50 ? PINK : GREEN);
const needColor = (pct: number) => (pct > 50 ? ORANGE : BLUE);

export function NutrientReport({ report }: { report: SmartQuizResult }) {
  const r = report.result;
  const byKey = new Map((r.intakeIndexes ?? []).map((x) => [x.key, x]));
  const byEngine = new Map((r.nutrients ?? []).map((n) => [n.name, n]));

  // a result saved before 2026-11-17 has only the 12 indexes inside nutrients (and no sources)
  const intakeOf = (i: IntakeItem): { value: number; sources: string[] } | null => {
    const row = byKey.get(i.key);
    if (row) return row.value === null ? null : { value: row.value, sources: row.sources ?? [] };
    const v = i.engine ? byEngine.get(i.engine)?.intakeIndex : null;
    return v == null ? null : { value: v, sources: [] };
  };
  const intakeGroups = INTAKE_GROUPS.map((g) => ({
    ...g,
    rows: g.items.flatMap((i) => {
      const x = intakeOf(i);
      return x ? [{ i, ...x }] : [];
    }),
  })).filter((g) => g.rows.length > 0);
  const minerals = MINERALS.flatMap((m) => {
    const n = byEngine.get(m.engine);
    return n ? [{ ...m, n }] : [];
  });
  if (intakeGroups.length === 0 && minerals.length === 0) return null;

  const sourcesNote = (sources: string[]) =>
    sources.length === 0 ? undefined : `주로 섭취: ${sources.map((q) => FOOD[q] ?? q).join(' · ')}`;

  return (
    <section className="flex flex-col gap-10 rounded-[28px] border border-[#e9e7df] bg-[#fbfaf7] px-5 py-7 sm:px-8 sm:py-9">
      {intakeGroups.length > 0 && (
        <div>
          <Header title="식사 섭취 지수" legend={
              <Legend
                items={[
                  [PINK, '적은 편 (50 이하)'],
                  [GREEN, '많은 편 (50 초과)'],
                ]}
              />
            }>
            음식 섭취 빈도 응답으로 계산했습니다. 높을수록 그 영양소가 든 음식을 자주 드시는 편입니다. 권장섭취량 대비 섭취율은
            아닙니다.
          </Header>
          <div className="mt-6 flex flex-col gap-8">
            {intakeGroups.map((g) => (
              <div key={g.title}>
                <h3 className="text-[16px] font-semibold sm:text-[18px]">{g.title}</h3>
                <div className="mt-4 grid gap-x-10 gap-y-3 md:grid-cols-2">
                  {g.rows.map(({ i, value, sources }) => (
                    <Bar key={i.key} label={i.label} value={value} color={intakeColor} note={sourcesNote(sources)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {minerals.length > 0 && (
        <div className="border-t border-[#e9e7df] pt-8">
          <Header title="무기질 필요도" legend={
              <Legend
                items={[
                  [ORANGE, '보충 필요 (50 초과)'],
                  [BLUE, '양호 (50 이하)'],
                ]}
              />
            }>
            무기질은 섭취 지수가 없어 필요도로 보여드립니다. 높을수록 보충이 더 필요합니다.
          </Header>
          <div className="mt-6 grid gap-x-10 gap-y-3 md:grid-cols-2">
            {minerals.map(({ label, engine, n }) => (
              <Bar
                key={engine}
                label={label}
                value={n.correctedNeed * 100}
                color={needColor}
                note={`하루 필요량 ${num(n.target)} ${n.unit} · 권장섭취량 ${num(n.rni)} ${n.unit}`}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-[#85847e] sm:text-sm">영양 관리 참고용이며 질병 진단·치료·예방 표현이 아닙니다.</p>
    </section>
  );
}
