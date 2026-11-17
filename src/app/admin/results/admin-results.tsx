'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllResults, getResultByAdmin, type AdminResult } from '@/lib/admin';
import { NutrientReport } from '../../nutrient-report';
import { PrintDialog } from './print-dialog';

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

const card = 'rounded-2xl border border-[#e9e7df] bg-white';
const th = 'px-5 py-3 font-medium';
const td = 'px-5 py-3';

// Every member's results (like v1, where the admin printed from each survey). ?id= opens one.
export function AdminResults() {
  const id = useSearchParams().get('id');
  return id ? <ResultDetail id={id} /> : <ResultList />;
}

function ResultList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ list: AdminResult[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllResults(page, PAGE_SIZE)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <h1 className="text-2xl font-semibold sm:text-3xl">결과 · 출력</h1>
      <p className="mt-1 text-sm text-[#85847e]">회원별 분석 결과입니다. 결과를 열어 출력 내용을 확인합니다.</p>

      {error ? (
        <p className="mt-8 text-sm text-[#c0392b]">{error}</p>
      ) : !data ? (
        <p className="mt-8 text-sm text-[#85847e]">불러오는 중…</p>
      ) : (
        <>
          <div className={`mt-6 overflow-x-auto ${card}`}>
            {data.list.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#85847e]">결과가 없습니다.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-[#85847e]">
                  <tr>
                    <th className={th}>일시</th>
                    <th className={th}>회원</th>
                    <th className={th}>사용 데이터</th>
                    <th className={th}>제품</th>
                    <th className={`${th} text-right`}>잉크 합계</th>
                    <th className={th}><span className="sr-only">열기</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.list.map((r) => (
                    <tr key={r._id} className="border-t border-[#f0eee8]">
                      <td className={`${td} tabular-nums`}>{dateFormat.format(new Date(r.createdAt))}</td>
                      <td className={`${td} font-medium`}>{r.memberNick ?? '알 수 없음'}</td>
                      <td className={td}>{r.usedSourcesLabel}</td>
                      <td className={td}>{r.result.product.offered1}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(r.result.inkTotalG)} g</td>
                      <td className={`${td} text-right`}>
                        <Link
                          href={`/admin/results?id=${r._id}`}
                          className="inline-flex h-8 items-center rounded-full bg-[#0f1628] px-3.5 text-xs font-semibold text-white transition hover:bg-[#1d2a44]"
                        >
                          열기 · 출력
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-[#e9e7df] bg-white px-3 py-1.5 disabled:opacity-40">
                이전
              </button>
              <span className="tabular-nums text-[#85847e]">{page} / {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-[#e9e7df] bg-white px-3 py-1.5 disabled:opacity-40">
                다음
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ResultDetail({ id }: { id: string }) {
  const [r, setR] = useState<AdminResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getResultByAdmin(id)
      .then((d) => !cancelled && setR(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Link href="/admin/results" className="text-sm text-[#85847e] hover:underline">← 결과 목록</Link>
      {error ? (
        <p className="mt-8 text-sm text-[#c0392b]">{error}</p>
      ) : !r ? (
        <p className="mt-8 text-sm text-[#85847e]">불러오는 중…</p>
      ) : (
        <Detail r={r} />
      )}
    </>
  );
}

function Detail({ r }: { r: AdminResult }) {
  const [printOpen, setPrintOpen] = useState(false);
  const p = r.result.profile;
  const sex = p?.sex ?? '-';
  return (
    <>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{r.memberNick ?? '알 수 없음'}</h1>
          <p className="mt-1 text-sm text-[#85847e]">
            {dateFormat.format(new Date(r.createdAt))} · {r.usedSourcesLabel}
            {!r.isLatest && ' · 최신 결과 아님'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <section className={`${card} p-5`}>
            <h2 className="text-base font-semibold">기본 정보</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-[#85847e]">성별</dt><dd>{sex}</dd></div>
              <div><dt className="text-xs text-[#85847e]">나이</dt><dd>{p?.age ?? '-'}</dd></div>
              <div><dt className="text-xs text-[#85847e]">키 · 몸무게</dt><dd>{p?.heightCm ?? '-'} cm · {p?.weightKg ?? '-'} kg</dd></div>
              <div><dt className="text-xs text-[#85847e]">BMI</dt><dd>{r.result.bmi != null ? fmt(r.result.bmi) : '-'}</dd></div>
            </dl>
            <p className="mt-3 text-sm"><span className="text-xs text-[#85847e]">상태</span> {r.result.status}</p>
          </section>

          <section className={`${card} overflow-x-auto`}>
            <h2 className="px-5 pt-5 text-base font-semibold">우선 영양소 Top 5</h2>
            <table className="mt-2 w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-[#85847e]">
                <tr>
                  <th className={th}>순위</th>
                  <th className={th}>영양소</th>
                  <th className={`${th} text-right`}>필요도</th>
                  <th className={`${th} text-right`}>1회 공급</th>
                </tr>
              </thead>
              <tbody>
                {r.result.topNutrientRows.map((n) => (
                  <tr key={n.rank} className="border-t border-[#f0eee8]">
                    <td className={`${td} tabular-nums`}>{n.rank}</td>
                    <td className={td}>{n.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{Math.round(n.correctedNeed * 100)}%</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {n.supplied != null ? `${fmt(n.supplied)} ${n.unit}` : (n.suppliedText ?? '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <NutrientReport report={r} />
        </div>

        <aside className="flex flex-col gap-4">
          <section className={`${card} p-5`}>
            <h2 className="text-base font-semibold">출력 내용</h2>
            <p className="mt-1 text-xs text-[#85847e]">{r.result.product.offered1}{r.result.product.plan ? ` · ${r.result.product.plan}` : ''}</p>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-[#85847e]">
                <tr>
                  <th className="py-2 font-medium">잉크</th>
                  <th className="py-2 text-right font-medium">g</th>
                  <th className="py-2 text-right font-medium">ml</th>
                </tr>
              </thead>
              <tbody>
                {r.result.ink.map((k) => (
                  <tr key={k.id} className="border-t border-[#f0eee8]">
                    <td className="py-2">{k.name}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(k.g)}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(k.ml)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[#e9e7df] font-semibold">
                  <td className="py-2">합계</td>
                  <td className="py-2 text-right tabular-nums">{fmt(r.result.inkTotalG)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-base font-semibold">프린터 출력</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#85847e]">프린터 프록시로 매장 프린터에 보내고, LCD 패널에서 출력 상태를 봅니다.</p>
            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              className="mt-4 h-11 w-full rounded-full bg-[#0d79ea] text-sm font-semibold text-white transition hover:bg-[#2788f0]"
            >
              출력하기
            </button>
          </section>
          {printOpen && (
            <PrintDialog
              resultId={String(r._id)}
              title={`${r.memberNick ?? '알 수 없음'} · ${dateFormat.format(new Date(r.createdAt))}`}
              onClose={() => setPrintOpen(false)}
            />
          )}
        </aside>
      </div>
    </>
  );
}
