'use client';

import type { SmartQuizResult } from '@/lib/smart-quiz';

// Report header like the printed iink report: 나이 / 성별 / 키 / 체중 on the left, the BMI bar on the right.
// Outside the Excel 02_결과요약 form. BMI bands = 11_검진입력 row 7 cut-offs (AH7 대한비만학회):
// under 18.5 저체중 / 18.5–22.9 정상 / 23–24.9 비만전단계 / 25 이상 비만. The cut-offs come from the backend.

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });

export function ProfileCard({ report }: { report: SmartQuizResult }) {
  const r = report.result;
  const p = r.profile;
  if (!p) return null;
  const { low, border, high } = p.bmiCut;
  const bands = low != null && border != null && high != null
    ? [
        { label: '저체중', from: null as number | null, to: low },
        { label: '정상', from: low, to: border },
        { label: '비만전단계', from: border, to: high },
        { label: '비만', from: high, to: null as number | null },
      ]
    : null;
  const bmi = r.bmi ?? null;
  const at = bands && bmi != null ? bands.findIndex((b) => (b.from == null || bmi >= b.from) && (b.to == null || bmi < b.to)) : -1;
  // marker: the band's slot, then inside it by value (open-ended bands use the next band's width; drawing only)
  let left = 0;
  if (bands && bmi != null && at >= 0) {
    const b = bands[at];
    const width = b.from != null && b.to != null ? b.to - b.from : (border! - low!);
    const start = b.from ?? b.to! - width;
    const inside = Math.min(0.95, Math.max(0.05, (bmi - start) / width));
    left = ((at + inside) / bands.length) * 100;
  }
  const rows: [string, string][] = [
    ['나이', p.age != null ? `${fmt(p.age)}세` : '–'],
    ['성별', p.sex ?? '–'],
    ['키', p.heightCm != null ? `${fmt(p.heightCm)}cm` : '–'],
    ['체중', p.weightKg != null ? `${fmt(p.weightKg)}kg` : '–'],
  ];
  const source = r.bmiSource === 'checkup' ? '검진 키·체중 기준' : r.bmiSource === 'mixed' ? '검진·설문 키·체중 기준' : '설문 키·체중 기준';

  return (
    <section className="grid gap-4 sm:grid-cols-[minmax(220px,300px)_1fr]">
      <dl className="overflow-hidden rounded-[20px] border border-[#cfe8d8] bg-white text-sm sm:text-base">
        {rows.map(([k, v]) => (
          <div key={k} className="flex border-b border-dashed border-[#cfe8d8] last:border-b-0">
            <dt className="w-[96px] shrink-0 bg-[#dceee6] px-4 py-3 font-medium text-[#3d7a55]">{k}</dt>
            <dd className="px-4 py-3">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col justify-center rounded-[20px] border border-[#e9e7df] bg-white px-5 py-6 sm:px-8">
        {bmi == null || !bands || at < 0 ? (
          <p className="text-center text-[#85847e]">키와 체중이 없어 BMI를 계산하지 못했습니다.</p>
        ) : (
          <>
            <p className="text-center text-[17px] font-medium sm:text-[20px]">
              BMI 체질량지수는 <span className="font-semibold text-[#3d7a55]">{bands[at].label}</span>이에요
            </p>
            <div className="relative mx-auto mt-8 w-full max-w-[560px]">
              <div className="absolute -top-7 -translate-x-1/2 text-center" style={{ left: `${left}%` }}>
                <span className="text-[18px] font-semibold text-[#3d7a55]">{fmt(bmi)}</span>
                <span className="block text-[10px] leading-none text-[#3d7a55]">▼</span>
              </div>
              <div className="flex overflow-hidden rounded-full">
                {bands.map((b, i) => (
                  <span
                    key={b.label}
                    className={`flex-1 py-2 text-center text-xs sm:text-sm ${i === at ? 'bg-[#55aa7a] font-semibold text-white' : 'bg-[#ecebe6] text-[#85847e]'}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
              <div className="relative mt-1 h-4 text-[11px] text-[#85847e]">
                {bands.slice(1).map((b, i) => (
                  <span key={b.label} className="absolute -translate-x-1/2" style={{ left: `${((i + 1) / bands.length) * 100}%` }}>
                    {b.from}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-[#85847e]">({source})</p>
          </>
        )}
      </div>
    </section>
  );
}
