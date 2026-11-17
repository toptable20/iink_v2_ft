'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth';
import { getAdminDashboardStats, getAllResults, type AdminDashboardStats, type AdminResult } from '@/lib/admin';

const today = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' });
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
const num = new Intl.NumberFormat('ko-KR');

function Stat({ label, value, note, color }: { label: string; value: number; note: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#e9e7df] bg-white px-5 pb-4 pt-5">
      <p className="text-sm text-[#5f5e58]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{num.format(value)}</p>
      <p className="mt-1 text-xs text-[#85847e]">{note}</p>
      <div className={`mt-4 h-1 rounded-full ${color}`} />
    </div>
  );
}

export function AdminDashboard() {
  const session = useSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [results, setResults] = useState<{ list: AdminResult[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminDashboardStats(), getAllResults(1, 6)])
      .then(([s, r]) => {
        if (cancelled) return;
        setStats(s);
        setResults(r);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <p className="text-xs font-semibold tracking-[.12em] text-[#85847e]">{today.format(new Date())}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">안녕하세요, {session?.member.memberNick} 님</h1>
          <p className="mt-1 text-sm text-[#85847e]">iink 운영 현황입니다.</p>
        </div>
        <Link
          href="/admin/results"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e9e7df] bg-white px-4 text-sm font-medium transition hover:border-[#0d79ea]/40"
        >
          결과 · 출력 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>

      {error ? (
        <p className="mt-8 text-sm text-[#c0392b]">{error}</p>
      ) : !stats || !results ? (
        <p className="mt-8 text-sm text-[#85847e]">불러오는 중…</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="전체 회원" value={stats.totalMembers} note="모든 계정" color="bg-[#0d79ea]" />
            <Stat label="분석 결과" value={results.total} note="저장된 결과 수" color="bg-[#55aa7a]" />
            <Stat label="진행 중 주문" value={stats.openOrders} note="대기 · 확인 · 배송 중" color="bg-[#f0b44c]" />
            <Stat label="관리자" value={stats.adminMembers} note={`차단 ${stats.blockedMembers} · 탈퇴 ${stats.deletedMembers}`} color="bg-[#0f1628]" />
          </div>

          <section className="mt-6 rounded-2xl border border-[#e9e7df] bg-white">
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <h2 className="text-base font-semibold">최근 분석 결과</h2>
                <p className="text-xs text-[#85847e]">새 결과부터</p>
              </div>
              <Link href="/admin/results" className="text-sm text-[#0d79ea] hover:underline">전체 보기</Link>
            </div>
            {results.list.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#85847e]">결과가 없습니다.</p>
            ) : (
              <ul className="mt-3">
                {results.list.map((r) => (
                  <li key={r._id} className="border-t border-[#f0eee8]">
                    <Link href={`/admin/results?id=${r._id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#f8f7f2]">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0f1628] text-sm font-semibold text-white">
                        {Array.from((r.memberNick ?? '?').trim())[0]?.toLocaleUpperCase() ?? '?'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.memberNick ?? '알 수 없음'}</span>
                        <span className="block truncate text-xs text-[#85847e]">{r.usedSourcesLabel} · {r.result.product.offered1}</span>
                      </span>
                      <span className="hidden text-xs text-[#85847e] tabular-nums sm:block">{dateFormat.format(new Date(r.createdAt))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
