'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { useSession } from '@/lib/auth';
import type { NutrientConsumption, Profile, Report, TopicLevel, TopicScore } from '@/lib/api';
import type { DataSource, DataSourceStatus, HealthReport } from '@/lib/health-report';

const SOURCE_LABEL: Record<DataSource, { label: string; connect?: string }> = {
  QUIZ: { label: 'Quiz' },
  NHIS: { label: 'Health checkup (NHIS)', connect: '/checkup' },
  WATCH: { label: 'Watch / phone', connect: '/devices' },
};

const STATUS_LABEL: Record<DataSourceStatus, { text: string; className: string }> = {
  USED: { text: 'Used', className: 'bg-[#dceee6] text-[#3d7a55]' },
  NOT_USED: { text: 'Connected, not used', className: 'bg-[#f3efe2] text-[#8a7a4a]' },
  NOT_CONNECTED: { text: 'Not connected', className: 'bg-[#ecebe6] text-[#77766f]' },
};

// Quiz questions that measured data can replace.
const DATA_QUESTION_LABEL: Record<string, string> = { L01: 'Exercise', L02: 'Sleep' };

export const LEVEL_LABEL: Record<TopicLevel, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const LEVEL_COLOR: Record<TopicLevel, { text: string; bg: string; bar: string }> = {
  HIGH: { text: '#b4553f', bg: '#fbe3dc', bar: '#e69c86' },
  MEDIUM: { text: '#8a6a14', bg: '#f8ecc9', bar: '#d9b44a' },
  LOW: { text: '#3d7a55', bg: '#dceee6', bar: '#83c99a' },
};
const DIAGRAM_STEPS = 5;

// BMI bands as printed on the report design; the backend decides which one applies.
const BMI_BANDS = [
  { key: 'underweight', label: 'Underweight' },
  { key: 'normal', label: 'Normal' },
  { key: 'overweight', label: 'Overweight' },
  { key: 'obese', label: 'Obese' },
  { key: 'severelyObese', label: 'Severely obese' },
];
const BMI_CUTS = ['18.5', '23', '25', '30'];

const card = 'rounded-[28px] border border-[#e9e7df] bg-[#fbfaf7] px-5 py-6 sm:px-7 sm:py-8';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#3b3b3b" />
      <path d="m6 10.2 2.7 2.6L14 7.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const amount = (n: NutrientConsumption) =>
  n.unit === 'kcal' ? Math.round(n.dailyAmount).toLocaleString('en-US') : n.dailyAmount.toLocaleString('en-US', { maximumFractionDigits: 2 });

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

// Results saved before algorithm 2.0.0 have no profile. They are hidden for now (kept in the database).
export const isCurrentReport = (report: Report) => report.profile !== null;

// saved: the report was just saved to the member's results (logged-in quiz).
// A combined result (HealthReport) also shows which data it is based on.
export function ReportView({
  report,
  onRestart,
  saved = false,
}: {
  report: Report | HealthReport;
  onRestart: () => void;
  saved?: boolean;
}) {
  const session = useSession();
  const memberName = session?.member.memberNick.trim() || 'there';
  const asOf = dayFormat.format('createdAt' in report ? new Date(report.createdAt) : new Date());
  const review = report.safety.filter((item) => item.needsReview);
  const nutrients = report.consumption.nutrients;
  const energy = nutrients.filter((n) => n.group === 'energy');
  const macros = nutrients.filter((n) => n.group === 'macro');
  const vitamins = nutrients.filter((n) => n.group === 'vitamin');

  if (!isCurrentReport(report)) return <OldResult />;

  return (
    <div className="min-h-screen w-full bg-[#f8f7f2] font-sans text-[#3b3b3b]">
      <header className="mx-auto flex w-full max-w-[560px] items-center justify-between px-6 pb-6 pt-9 sm:px-8 sm:pt-12">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full bg-[#dceee6] text-[25px] font-semibold text-[#55aa7a]">
            {memberName === 'there' ? 'T' : [...memberName][0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] leading-tight text-[#3b3b3b] sm:text-[25px]">
              Nutrition analysis for <span className="font-semibold text-[#55aa7a]">{memberName === 'there' ? 'you' : memberName}</span>
            </h1>
            <p className="mt-1 text-sm text-[#55aa7a]">(as of {asOf})</p>
          </div>
        </div>
        <Link
          href="/"
          aria-label="Close report"
          className="ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#555550] transition hover:bg-[#efeee8]"
        >
          <CloseIcon />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-5 pb-12 sm:px-8">
        {saved ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe8d8] bg-[#eef8f1] px-4 py-3 text-sm text-[#3d7a55]">
            <span>Your result was saved.</span>
            <Link href="/results" className="shrink-0 font-semibold underline-offset-4 hover:underline">
              See my results
            </Link>
          </div>
        ) : (
          !session && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e9e7df] bg-white px-4 py-3 text-sm text-[#5f5e58]">
              <span>Log in to save your result.</span>
              <Link href="/login" className="shrink-0 font-semibold text-[#3b3b3b] underline-offset-4 hover:underline">
                Log in
              </Link>
            </div>
          )
        )}

        {'sources' in report && report.preview && (
          <div role="note" className="rounded-2xl border-2 border-dashed border-[#d9a441] bg-[#fff6e0] px-4 py-3 text-sm text-[#7a5a14]">
            <p className="font-semibold">PREVIEW · fake test data</p>
            <p className="mt-1 text-xs leading-relaxed">
              Demo account: the watch and checkup data are fake, the watch rules are not approved yet, and the checkup mapping
              is a demo. Use this only to see how the algorithm works.
            </p>
          </div>
        )}

        {'sources' in report && <BasedOn report={report} />}

        {report.profile && <ProfileSection profile={report.profile} />}

        <section className={card}>
          <SectionTitle>Daily calories and main nutrients</SectionTitle>
          <p className="mt-1 text-sm text-[#85847e]">Average per day, estimated from your diet answers</p>
          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            {energy.map((n) => (
              <div
                key={n.key}
                className="grid h-[132px] w-[132px] shrink-0 place-items-center rounded-full border-[10px] border-[#dceee6] bg-white text-center"
              >
                <span>
                  <span className="block text-[26px] font-semibold tabular-nums leading-none">{amount(n)}</span>
                  <span className="mt-1 block text-xs text-[#85847e]">{n.unit} / day</span>
                </span>
              </div>
            ))}
            <div className="flex w-full flex-col gap-2">
              {macros.map((n) => (
                <AmountRow key={n.key} nutrient={n} />
              ))}
            </div>
          </div>
        </section>

        <section className={card}>
          <SectionTitle>Vitamins</SectionTitle>
          <p className="mt-1 text-sm text-[#85847e]">Average per day · tap a vitamin to see which foods it came from</p>
          <VitaminGrid nutrients={vitamins} />
          <Notes notes={report.consumption.notes} />
        </section>

        <TopicSection topics={report.topics.topics} notes={report.topics.notes} />

        {review.length > 0 && (
          <section className="rounded-[28px] border border-[#efd9aa] bg-[#fffaf0] px-5 py-6 sm:px-7 sm:py-8">
            <h2 className="text-[17px] font-semibold">Answers that need a safety check</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#85847e]">These need to be checked before any product is suggested.</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {review.map((item) => (
                <li key={item.questionId} className="rounded-2xl bg-white/75 px-4 py-3">
                  {item.question} <span className="font-semibold">→ {item.answer}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          onClick={onRestart}
          className="mt-1 min-h-[64px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[17px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa]"
        >
          Take the quiz again
        </button>
      </main>
    </div>
  );
}

function OldResult() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-[#f8f7f2] px-6 text-center font-sans text-[#3b3b3b]">
      <p className="max-w-[420px] text-[17px] leading-relaxed">
        This result was made with an older version of the analysis. Take the quiz again to see your new result.
      </p>
      <Link
        href="/quiz"
        className="flex min-h-[56px] w-full max-w-[420px] items-center justify-center rounded-[20px] bg-[#a9dfbd] px-5 text-[16px] font-semibold transition-colors hover:bg-[#91d3aa]"
      >
        Take the quiz
      </Link>
    </main>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[17px] font-semibold">
      <CheckIcon />
      {children}
    </h2>
  );
}

function ProfileSection({ profile }: { profile: Profile }) {
  const rows: [string, string | null][] = [
    ['Age', profile.age == null ? null : `${profile.age}`],
    ['Sex', profile.sexLabel],
    ['Height', profile.heightCm == null ? null : `${profile.heightCm} cm`],
    ['Weight', profile.weightKg == null ? null : `${profile.weightKg} kg`],
  ];
  const bandIndex = BMI_BANDS.findIndex((b) => b.key === profile.bmiBand?.key);
  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[20px] border border-[#cfe8d8] bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="flex border-b border-[#e9e7df] last:border-b-0">
            <span className="w-[96px] shrink-0 bg-[#dceee6] px-4 py-2.5 text-sm text-[#3d7a55]">{label}</span>
            <span className="px-4 py-2.5 text-sm">{value ?? '–'}</span>
          </div>
        ))}
      </div>

      <div className={card}>
        {profile.bmi == null || bandIndex < 0 ? (
          <p className="text-center text-sm text-[#85847e]">BMI needs height and weight.</p>
        ) : (
          <>
            <p className="text-center text-[17px]">
              Your BMI is <span className="font-semibold text-[#55aa7a]">{BMI_BANDS[bandIndex].label.toLowerCase()}</span>
            </p>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {BMI_BANDS.map((b, i) => (
                <div key={b.key} className="flex flex-col items-center">
                  <span className={`h-5 text-sm font-semibold tabular-nums text-[#55aa7a] ${i === bandIndex ? '' : 'invisible'}`}>
                    {profile.bmi?.toFixed(2)}
                  </span>
                  <span className={`text-[10px] text-[#55aa7a] ${i === bandIndex ? '' : 'invisible'}`} aria-hidden="true">▼</span>
                  <span
                    className={`mt-1 w-full rounded-md px-1 py-1.5 text-center text-[11px] leading-tight ${
                      i === bandIndex ? 'bg-[#55aa7a] font-semibold text-white' : 'bg-[#ecebe6] text-[#85847e]'
                    }`}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-5 text-[10px] tabular-nums text-[#85847e]">
              {BMI_BANDS.map((b, i) => (
                <span key={b.key} className="text-right">
                  {BMI_CUTS[i] ?? ''}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function AmountRow({ nutrient }: { nutrient: NutrientConsumption }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[92px] shrink-0 text-sm">{nutrient.label}</span>
      <span className="flex min-h-[28px] flex-1 items-center justify-end rounded-full bg-[#dceee6] px-3 text-sm font-semibold tabular-nums text-[#3d7a55]">
        {amount(nutrient)} <span className="ml-1 text-xs font-normal text-[#77766f]">{nutrient.unit}</span>
      </span>
    </div>
  );
}

function VitaminGrid({ nutrients }: { nutrients: NutrientConsumption[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const selected = nutrients.find((n) => n.key === open);
  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {nutrients.map((n) => (
          <button
            key={n.key}
            type="button"
            aria-expanded={open === n.key}
            onClick={() => setOpen(open === n.key ? null : n.key)}
            className={`flex items-center justify-between gap-2 rounded-full px-4 py-2 text-left text-sm transition-colors ${
              open === n.key ? 'bg-[#55aa7a] text-white' : 'bg-white hover:bg-[#eef8f1]'
            }`}
          >
            <span className="truncate">{n.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {amount(n)} <span className={`text-xs font-normal ${open === n.key ? 'text-white/80' : 'text-[#77766f]'}`}>{n.unit}</span>
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-3 rounded-2xl bg-white/75 px-4 py-3 text-xs leading-relaxed text-[#85847e]">
          <p className="mb-1 font-medium text-[#5f5e58]">{selected.label}: main food sources</p>
          {selected.sources.length > 0
            ? selected.sources.slice(0, 3).map((s) => (
                <p key={`${s.questionId}-${s.food}`}>
                  {s.food} · {s.sharePercent}%
                </p>
              ))
            : <p>No food sources to show.</p>}
        </div>
      )}
    </>
  );
}

function TopicSection({ topics, notes }: { topics: TopicScore[]; notes: string[] }) {
  const measured = topics.some((t) => t.level);
  const sorted = [...topics].sort((a, b) => (b.diagramLevel ?? 0) - (a.diagramLevel ?? 0));
  return (
    <section className={card}>
      <SectionTitle>Health topics</SectionTitle>
      <p className="mt-1 text-sm text-[#85847e]">How much attention each area needs: High, Medium or Low (not a diagnosis)</p>
      {!measured ? (
        <p className="mt-5 text-sm text-[#85847e]">
          This result was saved before topics were shown as High, Medium and Low. Take the quiz again to see them.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {sorted.map((t) => (
            <div key={t.key}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{t.label}</span>
                {t.level ? (
                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ color: LEVEL_COLOR[t.level].text, backgroundColor: LEVEL_COLOR[t.level].bg }}
                  >
                    {LEVEL_LABEL[t.level]}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-[#85847e]">Not enough answers</span>
                )}
              </div>
              {t.level && t.diagramLevel != null && (
                <div className="mt-2 grid grid-cols-5 gap-1" role="img" aria-label={`${t.label}: ${LEVEL_LABEL[t.level]}`}>
                  {Array.from({ length: DIAGRAM_STEPS }, (_, i) => (
                    <span
                      key={i}
                      className="h-2.5 rounded-full"
                      style={{ backgroundColor: i < t.diagramLevel! ? LEVEL_COLOR[t.level!].bar : '#ecebe6' }}
                    />
                  ))}
                </div>
              )}
              {t.reasons.length > 0 && (
                <p className="mt-2 text-xs leading-relaxed text-[#85847e]">Main reasons: {t.reasons.map((r) => r.feature).join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <Notes notes={notes} />
    </section>
  );
}

// "Based on": which sources shaped this result, and which answers came from measured data.
function BasedOn({ report }: { report: HealthReport }) {
  return (
    <section className={card}>
      <h2 className="text-[17px] font-semibold">Data used for this result</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {report.sources.map((s) => {
          const label = SOURCE_LABEL[s.source];
          const status = STATUS_LABEL[s.status];
          return (
            <li key={s.source} className="rounded-2xl bg-white/75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{label.label}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.text}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#85847e]">{s.note}</p>
              {s.status === 'NOT_CONNECTED' && label.connect && (
                <Link href={label.connect} className="mt-1 inline-block text-xs font-semibold text-[#55aa7a] underline-offset-4 hover:underline">
                  Connect {label.label} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {report.dataAnswers.length > 0 && (
        <div className="mt-4 border-t border-[#e9e7df] pt-4">
          <p className="text-sm font-medium">Answers replaced by measured data</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-[#5f5e58]">
            {report.dataAnswers.map((a) => (
              <li key={a.questionId}>
                · {DATA_QUESTION_LABEL[a.questionId] ?? a.questionId}: from {SOURCE_LABEL[a.source].label}, {a.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Notes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <ul className="mt-5 flex flex-col gap-1 text-xs leading-relaxed text-[#85847e]">
      {notes.map((note) => <li key={note}>· {note}</li>)}
    </ul>
  );
}
