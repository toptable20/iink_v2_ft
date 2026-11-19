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
// Layout (CEO 2026-11-19): ONE table for 주요 영양소, 비타민 and 무기질 alike: left = how much they need (필요도 bar +
// 하루 필요량), right = 식사 섭취 지수. A value the Excel does not have shows "–": minerals have no intake index yet
// (minerals: the 24 formula on sheet 23's mineral columns, computed by the backend). Only V9's 17 calculated nutrients are listed: 탄수화물·지방·
// 비타민 K·판토텐산·비오틴 (intake index only, no V9 need) are dropped (Max 2026-11-19).
// Each column has its own legend so the two colour rules never mix.
// Highlight (CEO 11-13 "key deficient highlighted/expandable"): the Excel's own priority list = 02 A18:F22 Top 5
// (topNutrientRows). Those rows get a badge and open to show 주요 근거 Topic · 1회 목표량 · 실제 공급량. Nothing is
// re-ranked or re-calculated here.
// Food answers: the N01–N07 answers behind the intake index, in V9's option wording (13_응답코드정의).

// Which columns the report shows (Max 2026-11-19). Both are in every result; a flag only shows or hides one.
// Need (V9 보충 필요도 + 하루 목표량 + Top-5 badges): changes when NHIS / watch are added (it follows the topic
// scores), so the 4-case comparison has something to compare. Intake (식사 섭취 지수): food answers only, the same
// in all 4 cases; hidden for now so users never read two different % bars against each other.
const SHOW_NEED = true;
const SHOW_INTAKE = false;

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
      { label: '단백질', key: 'Protein g', engine: 'Protein' },
      { label: '식이섬유', key: 'Fiber g', engine: 'Fiber' },
    ],
  },
  {
    title: '비타민',
    items: [
      { label: '비타민 A', key: 'Vit A ug RAE', engine: 'Vitamin A' },
      { label: '비타민 D', key: 'Vit D ug', engine: 'Vitamin D' },
      { label: '비타민 E', key: 'Vit E mg', engine: 'Vitamin E' },
      { label: '비타민 C', key: 'Vit C mg', engine: 'Vitamin C' },
      { label: '비타민 B1', key: 'B1 mg', engine: 'Thiamin B1' },
      { label: '비타민 B2', key: 'B2 mg', engine: 'Riboflavin B2' },
      { label: '나이아신 (B3)', key: 'Niacin mg', engine: 'Niacin' },
      { label: '비타민 B6', key: 'B6 mg', engine: 'Vitamin B6' },
      { label: '엽산', key: 'Folate ug', engine: 'Folate' },
      { label: '비타민 B12', key: 'B12 ug', engine: 'Vitamin B12' },
    ],
  },
];

// V9's 5 minerals: intake index = the 24 formula on 23's mineral columns (backend, display only; keys as sent)
const MINERALS: IntakeItem[] = [
  { label: '칼슘', key: 'Ca mg', engine: 'Calcium' },
  { label: '마그네슘', key: 'Mg mg', engine: 'Magnesium' },
  { label: '철', key: 'Fe mg', engine: 'Iron' },
  { label: '아연', key: 'Zn mg', engine: 'Zinc' },
  { label: '셀레늄', key: 'Se ug', engine: 'Selenium' },
];

const num = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });

const intakeColor = (pct: number) => (pct <= 50 ? PINK : GREEN);
const needColor = (pct: number) => (pct > 50 ? ORANGE : BLUE);

// One small bar with the score inside (0–100, "/100": both are indexes, not percentages); null = no value ("–").
function MiniBar({ value, color, note, empty }: { value: number | null; color: (pct: number) => string; note?: string; empty: string }) {
  if (value === null) {
    return (
      <div className="min-w-0">
        <div className="flex h-5 items-center rounded-[10px] bg-white px-2 text-[11px] text-[#9b9b96] ring-1 ring-[#ecebe6] sm:h-6 sm:text-[13px]">–</div>
        <p className="mt-1 break-keep text-[11px] text-[#9b9b96] sm:text-xs">{empty}</p>
      </div>
    );
  }
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className="min-w-0">
      <div className="relative h-5 rounded-[10px] bg-white ring-1 ring-[#ecebe6] sm:h-6">
        <div className="h-full rounded-[10px]" style={{ width: `${pct}%`, backgroundColor: color(pct) }} />
        <p className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] leading-normal sm:text-[13px]">
          {pct}
          <span className="text-[9px] sm:text-[11px]"> / 100</span>
        </p>
      </div>
      {note && <p className="mt-1 break-keep text-[11px] text-[#5f5e58] sm:text-xs">{note}</p>}
    </div>
  );
}

function Legend({ items }: { items: [color: string, text: string][] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#5f5e58] sm:text-xs">
      {items.map(([color, text]) => (
        <li key={text} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

export function NutrientReport({ report }: { report: SmartQuizResult }) {
  const r = report.result;
  const top = new Map((r.topNutrientRows ?? []).map((t) => [t.name, t]));
  const byKey = new Map((r.intakeIndexes ?? []).map((x) => [x.key, x]));
  const byEngine = new Map((r.nutrients ?? []).map((n) => [n.name, n]));

  // a result saved before 2026-11-17 has only the 12 indexes inside nutrients (and no sources)
  const intakeOf = (i: IntakeItem): { value: number; sources: string[] } | null => {
    const row = i.key ? byKey.get(i.key) : undefined;
    if (row) return row.value === null ? null : { value: row.value, sources: row.sources ?? [] };
    const v = i.engine ? byEngine.get(i.engine)?.intakeIndex : null;
    return v == null ? null : { value: v, sources: [] };
  };
  const groups = [...INTAKE_GROUPS, { title: '무기질', items: MINERALS }]
    .map((g) => ({
      ...g,
      rows: g.items.map((i) => ({ i, intake: intakeOf(i), need: i.engine ? (byEngine.get(i.engine) ?? null) : null })),
    }))
    // only the nutrients V9 calculates (42_영양소요구량, 17): a row without a V9 need is never shown (Max 2026-11-19)
    .map((g) => ({ ...g, rows: g.rows.filter((x) => x.need !== null) }))
    .filter((g) => g.rows.length > 0);
  if (groups.length === 0) return null;

  // Need only (team leader 2026-11-19): the v1 printed-report layout. Sections 주요 영양소 / 비타민 / 무기질 with a
  // check mark, rows in columns: name, a round bar with the need score inside, and "보충 목표량 / 권장섭취량" after it.
  // The bar shows 영양 충분도 = 100 − 보충 필요도 (Max 2026-11-19: "vitamin E need 21 → show 79 green"), the same V9
  // value turned around so higher = better, like the v1 report. Green at 50 or more (= need 50 or less), pink below 50
  // (= need above 50): the same split as before, only the direction changed. Badges / amounts unchanged.
  // Shown as a percentage in the v1 print style: pink below 50%, green from 50% (Max 2026-11-19). No legend / text.
  if (SHOW_NEED && !SHOW_INTAKE) {
    return (
      <section className="flex flex-col gap-6 rounded-[28px] border border-[#e9e7df] bg-[#fbfaf7] px-5 py-7 sm:px-8 sm:py-9">
        <h2 className="text-[18px] font-semibold sm:text-[20px]">영양소 리포트</h2>
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="flex items-center gap-2 text-[16px] font-semibold sm:text-[18px]">
              <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
                <circle cx="10" cy="10" r="10" fill="#3b3b3b" />
                <path d="m6 10.2 2.7 2.6L14 7.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {g.title}
            </h3>
            <div className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {g.rows.map(({ i, need }) => {
                if (!need) return null;
                const needScore = Math.round(Math.min(100, Math.max(0, need.correctedNeed * 100)));
                const score = 100 - needScore; // 영양 충분도
                const t = i.engine ? top.get(i.engine) : undefined;
                return (
                  <div key={i.engine ?? i.key} className="grid grid-cols-[5.5rem_1fr] items-center gap-2" title={`하루 보충 목표량 ${num(need.target)} ${need.unit} / 하루 권장섭취량 ${num(need.rni)} ${need.unit}`} aria-label={`${i.label}: 영양 충분도 ${score}%, 하루 보충 목표량 ${num(need.target)} ${need.unit}, 하루 권장섭취량 ${num(need.rni)} ${need.unit}`}>
                    <span className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] leading-tight sm:text-sm">
                      <span className="font-medium">{i.label}</span>
                      {t && <span className="rounded-full bg-[#CE99C3] px-1.5 py-px text-[10px] font-bold text-white">우선 {t.rank}</span>}
                    </span>
                    <div className="relative flex h-6 min-w-0 items-center rounded-full bg-[#eeede8]">
                      <div className="flex h-full items-center rounded-full px-2.5 text-[11px] font-semibold text-[#3b3b3b] sm:text-xs" style={{ width: `${Math.max(score, 14)}%`, backgroundColor: score >= 50 ? GREEN : PINK }}>
                        {score}%
                      </div>
                      <span className="absolute right-3 text-[10px] tabular-nums text-[#85847e] sm:text-[11px]">
                        {num(need.target)}/{num(need.rni)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs leading-relaxed text-[#85847e] sm:text-sm">영양 관리 참고용이며 질병 진단·치료·예방 표현이 아닙니다.</p>
      </section>
    );
  }

  // label + intake, or label + need + intake
  const cols = SHOW_NEED && SHOW_INTAKE ? 'grid-cols-[28%_1fr_1fr]' : 'grid-cols-[28%_1fr]';

  const sourcesNote = (sources: string[]) =>
    sources.length === 0 ? undefined : `주로 섭취: ${sources.map((q) => FOOD[q] ?? q).join(' · ')}`;

  return (
    <section className="flex flex-col gap-8 rounded-[28px] border border-[#e9e7df] bg-[#fbfaf7] px-5 py-7 sm:px-8 sm:py-9">
      <div>
        <h2 className="text-[18px] font-semibold sm:text-[20px]">영양소 리포트</h2>
        <p className="mt-2 break-keep text-xs leading-relaxed text-[#85847e] sm:text-sm">
          {SHOW_NEED && SHOW_INTAKE
            ? '왼쪽은 보충 필요도(건강 상태로 계산, 높을수록 보충이 더 필요)와 하루 목표량, 오른쪽은 식사 섭취 지수(음식 섭취 빈도 응답으로 계산, 높을수록 그 영양소가 든 음식을 자주 드시는 편)입니다. 두 값은 서로 다른 기준의 0–100 점수이므로 합이 100이 되지 않으며, 권장섭취량 대비 비율(%)도 아닙니다.'
            : SHOW_NEED
              ? '보충 필요도는 설문과 연결한 건강검진·워치 데이터로 분석한 건강 상태를 바탕으로, 영양소마다 보충이 얼마나 필요한지 보여줍니다. 막대가 길수록 보충이 더 필요합니다. 막대 아래에는 하루 목표량과 한국인 영양소 섭취기준(권장량)이 함께 표시됩니다. 검진이나 워치 데이터를 추가하면 결과가 달라질 수 있습니다.'
              : '식사 섭취 지수는 음식 섭취 빈도 응답으로 계산하며, 높을수록 그 영양소가 든 음식을 자주 드시는 편입니다. 권장섭취량 대비 섭취율은 아닙니다.'}
        </p>
      </div>

      <div className={`grid ${cols} items-end gap-x-3 gap-y-1 border-b border-[#e9e7df] pb-3 sm:gap-x-6`}>
        <span />
        {SHOW_NEED && (
          <div>
            <p className="text-xs font-semibold text-[#3d7a55] sm:text-sm">보충 필요도</p>
            <Legend items={[[ORANGE, '보충이 더 필요해요 (50 초과)'], [BLUE, '충분한 편이에요 (50 이하)']]} />
          </div>
        )}
        {SHOW_INTAKE && (
          <div>
            <p className="text-xs font-semibold text-[#3d7a55] sm:text-sm">식사 섭취 지수</p>
            <Legend items={[[PINK, '적은 편 (50 이하)'], [GREEN, '많은 편 (50 초과)']]} />
          </div>
        )}
      </div>


      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="text-[16px] font-semibold sm:text-[18px]">{g.title}</h3>
          <div className="mt-3 flex flex-col gap-3">
            {g.rows.map(({ i, intake, need }) => {
              const t = SHOW_NEED && i.engine ? top.get(i.engine) : undefined;
              const cells = (
                <>
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5 break-words pt-0.5 text-[13px] leading-5 sm:text-base sm:leading-6">
                    {i.label}
                    {t && <span className="rounded-full bg-[#F2A65A] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white sm:text-[11px]">우선 {t.rank} <span className="inline-block transition-transform group-open:rotate-180" aria-hidden="true">▾</span></span>}
                  </span>
                  {SHOW_NEED && (
                    <MiniBar
                      value={need ? need.correctedNeed * 100 : null}
                      color={needColor}
                      note={need ? `하루 목표량 ${num(need.target)} ${need.unit} · 권장량 ${num(need.rni)} ${need.unit}` : undefined}
                      empty="V9 계산 항목 아님"
                    />
                  )}
                  {SHOW_INTAKE && (
                    <MiniBar value={intake ? intake.value : null} color={intakeColor} note={intake ? sourcesNote(intake.sources) : undefined} empty="자료 없음" />
                  )}
                </>
              );
              const intakeText = `섭취 지수 ${intake ? Math.round(intake.value) + '/100' : '없음'}`;
              const needText = `보충 필요도 ${need ? Math.round(need.correctedNeed * 100) + '/100' : '없음'}`;
              const label = `${i.label}: ${[SHOW_NEED && needText, SHOW_INTAKE && intakeText].filter(Boolean).join(', ')}`;
              if (!t) {
                return (
                  <div key={i.engine ?? i.key} className={`grid ${cols} items-start gap-x-3 sm:gap-x-6`} aria-label={label}>
                    {cells}
                  </div>
                );
              }
              // one of the Excel's Top 5 priority nutrients: highlighted, opens for its details
              return (
                <details key={i.engine ?? i.key} className="group -mx-2 rounded-xl bg-[#fff4e8] px-2 py-2 ring-1 ring-[#f6d9b8]">
                  <summary className={`grid cursor-pointer list-none ${cols} items-start gap-x-3 sm:gap-x-6`} aria-label={`${label} (자세히 보기)`}>
                    {cells}
                  </summary>
                  <dl className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-white px-3 py-2 text-[11px] sm:text-[13px]">
                    <div><dt className="text-[#85847e]">주요 근거 Topic</dt><dd className="font-medium">{t.mainTopic ?? '–'}</dd></div>
                    <div><dt className="text-[#85847e]">1회 목표량</dt><dd className="font-medium tabular-nums">{num(t.perServing)} {t.unit}</dd></div>
                  </dl>
                </details>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs leading-relaxed text-[#85847e] sm:text-sm">영양 관리 참고용이며 질병 진단·치료·예방 표현이 아닙니다.</p>
    </section>
  );
}
