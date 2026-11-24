'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';
import type { SmartQuizResult } from '@/lib/smart-quiz';
import { TOPIC_KO } from '@/lib/report-names';
import './report-sheet.css';

// The result as the supplied A4 design ("261120_iink_결과분석지_03"), one page. No QR code (removed on request).
// Everything shown comes from the saved result; nothing is calculated here except how long a bar is drawn.
// The PDF is a picture of this element (report-pdf.ts).

const PINK_BELOW_LEVEL = 5; // design: Level 1–4 pink, 5–10 green (the score bar follows its Level)
const PINK_BELOW_PCT = 50; // nutrient bars: pink under 50%, green from 50%


type Item = { label: string; engine: string };
// design columns (column by column, top to bottom)
const PROTEIN: Item[][] = [[{ label: '단백질', engine: 'Protein' }], [{ label: '식이섬유', engine: 'Fiber' }], []];
const VITAMINS: Item[][] = [
  [
    { label: '비타민 A', engine: 'Vitamin A' },
    { label: '비타민 E', engine: 'Vitamin E' },
    { label: '비타민 D', engine: 'Vitamin D' },
    { label: '비타민 C', engine: 'Vitamin C' },
  ],
  [
    { label: '비타민 B1', engine: 'Thiamin B1' },
    { label: '비타민 B2', engine: 'Riboflavin B2' },
    { label: '비타민 B6', engine: 'Vitamin B6' },
  ],
  [
    { label: '비타민 B12', engine: 'Vitamin B12' },
    { label: '나이아신', engine: 'Niacin' },
    { label: '엽산', engine: 'Folate' },
  ],
];
const MINERALS: Item[][] = [
  [
    { label: '칼슘', engine: 'Calcium' },
    { label: '철', engine: 'Iron' },
  ],
  [
    { label: '마그네슘', engine: 'Magnesium' },
    { label: '셀레늄', engine: 'Selenium' },
  ],
  [{ label: '아연', engine: 'Zinc' }],
];

const COL_LEFT = [3.7, 33.8, 64.8]; // em
// 영양 충분도 % = 100 − 보충 필요도×100, rounded like Excel ROUND: 1 − 0.555 is 0.44499999… in binary, so round the
// 12-digit value (44.5 → 45), not the raw float (→ 44).
const sufficiency = (cn: number) => Math.round(Number((100 - Math.min(100, Math.max(0, cn * 100))).toPrecision(12)));
const num = (n: number, d = 1) => n.toLocaleString('ko-KR', { maximumFractionDigits: d });

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#3d4141" />
      <path d="m5.8 10.3 2.8 2.8 5.6-5.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Text at a bar's right end (amount, Level, 최종점수) is drawn twice: grey on the empty track (under the bar), and a
// dark copy inside the coloured bar, clipped to it. So wherever the bar reaches, that part of the text turns dark and
// stays readable at any length. The copy is as wide as the whole bar (100 / pct of the fill) and right-aligned.
function OnFill({ pct, kind, children }: { pct: number; kind: 'amt' | 'cap'; children: ReactNode }) {
  if (!(pct > 0)) return null;
  return (
    <span className={`rs-on ${kind}`} aria-hidden="true" style={{ width: `${10000 / pct}%` }}>
      {children}
    </span>
  );
}

export function ReportSheet({ report, name, date, sheetRef, variant = 'pdf' }: { report: SmartQuizResult; name: string; date: string; sheetRef?: Ref<HTMLDivElement>; variant?: 'pdf' | 'web' }) {
  const r = report.result;
  const p = r.profile;
  const product = r.product;
  // V9 turns a topic off ('비활성') when it doesn't apply: 여성 건강 for anyone not female (v9.engine.ts). Off topics are
  // not shown, so men see 8 topics and the heading counts what is shown.
  const topics = r.topics.filter((t) => t.stage !== '비활성');

  // ---- BMI: the Excel's bands (11_검진입력 row 7: 18.5 / 23 / 25). The marker sits inside its band by value.
  const cut = p?.bmiCut;
  const bands =
    cut && cut.low != null && cut.border != null && cut.high != null
      ? [
          { label: '저체중', from: null as number | null, to: cut.low },
          { label: '정상', from: cut.low, to: cut.border },
          { label: '비만전단계', from: cut.border, to: cut.high },
          { label: '비만', from: cut.high, to: null as number | null },
        ]
      : null;
  const bmi = r.bmi ?? null;
  const at = bands && bmi != null ? bands.findIndex((b) => (b.from == null || bmi >= b.from) && (b.to == null || bmi < b.to)) : -1;
  let markLeft = 0;
  if (bands && bmi != null && at >= 0 && cut) {
    const b = bands[at];
    const width = b.from != null && b.to != null ? b.to - b.from : cut.border! - cut.low!;
    const start = b.from ?? b.to! - width;
    const inside = Math.min(0.95, Math.max(0.05, (bmi - start) / width));
    markLeft = ((at + inside) / bands.length) * 100;
  }
  const normal = at === 1;

  const profileRows: [string, string][] = [
    ['나이', p?.age != null ? `${num(p.age)}세` : '–'],
    ['성별', p?.sex ? p.sex.replace('성', '') : '–'],
    ['키', p?.heightCm != null ? `${num(p.heightCm)}cm` : '–'],
    ['체중', p?.weightKg != null ? `${num(p.weightKg)}kg` : '–'],
  ];
  const productRows: [string, string][] = [
    ['현재 제공 제품', product.offered1],
    ['조합제품', product.offered2],
    ['조합여부', product.combined ? '조합' : '단일'],
    ['28일 섭취 플랜', product.plan],
    ['라인업 기준 추천', product.lineupText],
  ];

  // ---- nutrients: 영양 충분도 = 100 − 보충 필요도 (V9 42 보정 요구지수), shown with 하루 보충 목표량 / 권장섭취량
  const need = new Map((r.nutrients ?? []).map((n) => [n.name, n]));
  const NutCell = ({ item, left, top }: { item: Item; left: number; top: number }) => {
    const n = need.get(item.engine);
    if (!n) return null; // only the nutrients V9 calculates
    const pct = sufficiency(n.correctedNeed);
    return (
      <div className="rs-cell" style={{ left: `${left}em`, top: `${top}em` }}>
        <span className="rs-label">{item.label}</span>
        <div className="rs-bars">
          <div className="rs-bar">
            <span className={`rs-fill ${pct < PINK_BELOW_PCT ? 'pink' : ''}`} style={{ width: `${pct}%` }}><span className="rs-fill-num">{pct}%</span><OnFill pct={pct} kind="amt">{num(n.target)}/{num(n.rni)}</OnFill></span>
            <span className="rs-amount">
              {num(n.target)}/{num(n.rni)}
            </span>
          </div>
        </div>
      </div>
    );
  };
  const nutGroup = (cols: Item[][], top: number, pitch: number) =>
    cols.flatMap((col, c) => col.map((item, i) => <NutCell key={item.engine} item={item} left={COL_LEFT[c]} top={top + i * pitch} />));

  if (variant === 'web') {
    // Website version (Max 2026-11-23): the same layout as the PDF ("261120_iink_결과분석지_03") in normal page flow,
    // so it reads like the downloaded PDF (no cards). Logo and company footer stay on the PDF only. Phones stack it.
    const nutrientGroups: Item[][][] = [PROTEIN, VITAMINS, MINERALS];
    const bmiLabel = bmi != null && bands && at >= 0 ? bands[at].label : null;
    // 이에요 after a final consonant (비만이에요), 예요 after a vowel (비만전단계예요)
    const ending = (w: string) => {
      const c = w.charCodeAt(w.length - 1) - 0xac00;
      return c >= 0 && c <= 11171 && c % 28 !== 0 ? '이에요' : '예요';
    };
    return (
      <article className="rs-web" data-report-sheet>
        <header className="rs-web-head">
          <h1><span>{name}님</span>을 위한 영양 분석 결과</h1>
          <p className="rs-web-note">*본 결과는 의사의 처방을 대신하지 않습니다.</p>
          <p className="rs-web-date">( {date} 기준 )</p>
        </header>

        <div className="rs-web-top">
          <div className="rs-web-left">
            <dl className="rs-web-profile">{profileRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <div className="rs-web-bmi">
              <h2>BMI 체질량지수는 {bmiLabel ? <><b className={normal ? 'rs-green-text' : 'rs-pink'}>{bmiLabel}</b>{ending(bmiLabel)}</> : '확인할 수 없어요'}</h2>
              {bmiLabel && bands && (
                <div className="rs-web-bmi-track">
                  <span className={`rs-web-bmi-mark ${normal ? 'ok' : ''}`} style={{ left: `${markLeft}%` }}>{num(bmi!)}<i>▼</i></span>
                  <div className={`rs-web-bmi-bands ${normal ? 'ok' : ''}`}>{bands.map((b, i) => <span key={b.label} className={i === at ? 'on' : ''}>{b.label}</span>)}</div>
                  <div className="rs-web-bmi-ticks">{bands.slice(1).map((b, i) => <span key={b.label} style={{ left: `${((i + 1) / bands.length) * 100}%` }}>{b.from}</span>)}</div>
                </div>
              )}
            </div>
          </div>
          <div className="rs-web-reco">
            <h2 className="rs-web-h2"><Check />추천 제품·섭취 플랜</h2>
            <dl>{productRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '–'}</dd></div>)}</dl>
          </div>
        </div>

        <section className="rs-web-sec">
          <h2 className="rs-web-h2"><Check />{topics.length}개 Topic <small>*Level 1~10 | 최종 점수 100점 기준</small></h2>
          <div className="rs-web-grid">{topics.map((t) => {
            const level = Number.parseFloat(t.displayLevel);
            const active = Number.isFinite(level);
            const pink = active && level < PINK_BELOW_LEVEL;
            const scorePct = t.score == null ? 0 : Math.max(0, Math.min(100, t.score));
            return <div className="rs-web-cell" key={t.topic}>
              <strong>{TOPIC_KO[t.topic] ?? t.topic}</strong>
              <div className="rs-bars">
                <div className="rs-bar"><span className={`rs-fill ${pink ? 'pink' : ''} ${active ? '' : 'off'}`} style={{ width: active ? `${Math.max(0, Math.min(100, level * 10))}%` : '100%' }}><span className="rs-fill-num">{t.displayLevel || '–'}</span>{active && <OnFill pct={level * 10} kind="cap">Level</OnFill>}</span><span className="rs-cap">Level</span></div>
                <div className="rs-bar"><span className={`rs-fill ${pink ? 'pink' : ''} ${t.score == null ? 'off' : ''}`} style={{ width: t.score == null ? '100%' : `${scorePct}%` }}><span className="rs-fill-num">{t.score == null ? '–' : `${num(t.score, 2)} 점`}</span>{t.score != null && <OnFill pct={scorePct} kind="cap">최종점수</OnFill>}</span><span className="rs-cap">최종점수</span></div>
              </div>
            </div>;
          })}</div>
        </section>

        <section className="rs-web-sec">
          <h2 className="rs-web-h2"><Check />주요 영양소 및 비타민, 무기질 <small>*데이터 기반 추정 섭취량 (100% 기준)</small></h2>
          {nutrientGroups.map((cols, g) => (
            <div className="rs-web-ngroup" key={g}>{cols.map((col, c) => (
              <div className="rs-web-ncol" key={c}>{col.map((item) => {
                const n = need.get(item.engine);
                if (!n) return null;
                const pct = sufficiency(n.correctedNeed);
                return <div className="rs-web-cell" key={item.engine}>
                  <strong>{item.label}</strong>
                  <div className="rs-bar"><span className={`rs-fill ${pct < PINK_BELOW_PCT ? 'pink' : ''}`} style={{ width: `${pct}%` }}><span className="rs-fill-num">{pct}%</span><OnFill pct={pct} kind="amt">{num(n.target)}/{num(n.rni)}</OnFill></span><span className="rs-amount">{num(n.target)}/{num(n.rni)}</span></div>
                </div>;
              })}</div>
            ))}</div>
          ))}
          <p className="rs-web-footnote">* 영양 관리 참고용이며 질병 진단, 치료, 예방 표현이 아닙니다.</p>
        </section>
      </article>
    );
  }

  return (
    <div className="rs-scroll">
      <div className="rs" ref={sheetRef} data-report-sheet>
        <div className="rs-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rs-bg" src="/brand/bg_ptn_2.png" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rs-abs rs-logo" src="/brand/logo_2.png" alt="iink" />
          <div className="rs-abs rs-line" style={{ top: '11.5em' }} />

          <h1 className="rs-abs rs-title">
            <span>{name}님</span>을 위한 영양 분석 결과
          </h1>
          <p className="rs-abs rs-date">( {date} 기준 )</p>
          <p className="rs-abs rs-note">*본 결과는 의사의 처방을 대신하지 않습니다.</p>

          <div className="rs-abs rs-table rs-profile">
            {profileRows.map(([k, v], i) => [
              <div key={`k${i}`} className="k" style={{ gridColumn: i % 2 === 0 ? 1 : 3, gridRow: i < 2 ? 1 : 2 }}>
                {k}
              </div>,
              <div key={`v${i}`} className="v" style={{ gridColumn: i % 2 === 0 ? 2 : 4, gridRow: i < 2 ? 1 : 2 }}>
                {v}
              </div>,
            ])}
          </div>

          <p className="rs-abs rs-bmi-title">
            {bmi == null || !bands || at < 0 ? (
              '키와 체중이 없어 BMI를 계산하지 못했습니다'
            ) : (
              <>
                BMI 체질량지수는 <b className={normal ? 'rs-green-text' : 'rs-pink'}>{bands[at].label}</b>이에요
              </>
            )}
          </p>
          {bmi != null && bands && at >= 0 && (
            <div className="rs-abs rs-bmi">
              <div className={`rs-bmi-mark ${normal ? 'ok' : ''}`} style={{ left: `${markLeft}%` }}>
                <b>{num(bmi)}</b>
                <i>▼</i>
              </div>
              <div className={`rs-bmi-bands ${normal ? 'ok' : ''}`}>
                {bands.map((b, i) => (
                  <span key={b.label} className={i === at ? 'on' : ''}>
                    {b.label}
                  </span>
                ))}
              </div>
              {bands.slice(1).map((b, i) => (
                <span key={b.label} className="rs-bmi-tick" style={{ left: `${((i + 1) / bands.length) * 100}%` } as CSSProperties}>
                  {b.from}
                </span>
              ))}
            </div>
          )}

          <h2 className="rs-abs rs-heading rs-h-reco">
            <Check />
            추천 제품·섭취 플랜
          </h2>
          <div className="rs-abs rs-table rs-reco">
            {productRows.flatMap(([k, v]) => [
              <div key={`k${k}`} className="k">
                {k}
              </div>,
              <div key={`v${k}`} className="v">
                {v || '–'}
              </div>,
            ])}
          </div>

          <h2 className="rs-abs rs-heading rs-h-topic">
            <Check />
            {topics.length}개 Topic <small>*Level 1~10 | 최종 점수 100점 기준</small>
          </h2>
          {topics.map((t, i) => {
            const level = Number.parseFloat(t.displayLevel);
            const active = Number.isFinite(level);
            const pink = active && level < PINK_BELOW_LEVEL;
            const tone = pink ? 'pink' : '';
            const levelPct = active ? Math.max(0, Math.min(100, level * 10)) : 0;
            const scorePct = t.score == null ? 0 : Math.max(0, Math.min(100, t.score));
            return (
              <div key={t.topic} className="rs-cell" style={{ left: `${COL_LEFT[i % 3]}em`, top: `${64.9 + Math.floor(i / 3) * 7.05}em` }}>
                <span className="rs-label">{TOPIC_KO[t.topic] ?? t.topic}</span>
                <div className="rs-bars">
                  <div className="rs-bar">
                    <span className={`rs-fill ${tone} ${active ? '' : 'off'}`} style={{ width: active ? `${levelPct}%` : '100%' }}><span className="rs-fill-num">{active ? t.displayLevel : t.displayLevel || '–'}</span>{active && <OnFill pct={levelPct} kind="cap">Level</OnFill>}</span>
                    <span className="rs-cap">Level</span>
                  </div>
                  <div className="rs-bar">
                    <span className={`rs-fill ${tone} ${t.score == null ? 'off' : ''}`} style={{ width: t.score == null ? '100%' : `${scorePct}%` }}><span className="rs-fill-num">{t.score == null ? '–' : `${num(t.score, 2)} 점`}</span>{t.score != null && <OnFill pct={scorePct} kind="cap">최종점수</OnFill>}</span>
                    <span className="rs-cap">최종점수</span>
                  </div>
                </div>
              </div>
            );
          })}

          <h2 className="rs-abs rs-heading rs-h-nut">
            <Check />
            주요 영양소 및 비타민, 무기질 <small>*데이터 기반 추정 섭취량 (100% 기준)</small>
          </h2>
          {nutGroup(PROTEIN, 92.6, 3.55)}
          <div className="rs-abs rs-rule" style={{ top: '97.8em' }} />
          {nutGroup(VITAMINS, 99.6, 3.55)}
          <div className="rs-abs rs-rule" style={{ top: '114.8em' }} />
          {nutGroup(MINERALS, 117.2, 3.5)}

          <p className="rs-abs rs-disclaimer">* 영양 관리 참고용이며 질병 진단, 치료, 예방 표현이 아닙니다.</p>
          <div className="rs-abs rs-line" style={{ top: '128.6em', background: '#717373' }} />
          <p className="rs-abs rs-foot">(주)탑테이블 &nbsp;|&nbsp; 02-3661-0031 &nbsp;|&nbsp; 서울시 마포구 성암로 330 DMC첨단산업센터 A동 606호 &nbsp;|&nbsp; www.toptable.co.kr</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rs-abs rs-foot-logo" src="/brand/toptable_2.png" alt="toptable" />
        </div>
      </div>
    </div>
  );
}
