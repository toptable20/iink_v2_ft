'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession } from '@/lib/auth';
import { AccountMenu } from '../account-menu';

const NAV = [
  { href: '/admin', label: '개요', icon: 'grid' },
  { href: '/admin/results', label: '결과 · 출력', icon: 'print' },
] as const;

function Icon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      {name === 'grid' ? (
        <g {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </g>
      ) : (
        <g {...common}>
          <path d="M7 9V4h10v5" />
          <rect x="4" y="9" width="16" height="7" rx="2" />
          <path d="M7 14h10v6H7z" />
        </g>
      )}
    </svg>
  );
}

// Admin layout: dark sidebar (site navy) + top bar with breadcrumb and the account menu. Admins only.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = [...NAV].reverse().find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)) ?? NAV[0];

  if (!session || session.member.memberType !== 'ADMIN') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f7f2] px-5 text-center text-[#3b3b3b]">
        <div>
          <p className="text-sm">{session ? '관리자만 볼 수 있는 페이지입니다.' : '로그인이 필요합니다.'}</p>
          <Link href={session ? '/' : '/login'} className="mt-3 inline-block text-sm font-semibold underline-offset-4 hover:underline">
            {session ? '홈으로' : '로그인'}
          </Link>
        </div>
      </main>
    );
  }

  const nav = (
    <nav aria-label="관리자 메뉴" className="mt-8 flex flex-col gap-1">
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-[.16em] text-white/45">WORKSPACE</p>
      {NAV.map((n) => {
        const active = n.href === current.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${active ? 'bg-white text-[#0f1628]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon name={n.icon} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f8f7f2] font-sans text-[#3b3b3b]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[#0f1628] px-4 py-6 lg:flex">
        <Link href="/" aria-label="iink 홈" className="flex h-12 items-center rounded-xl bg-white px-4">
          <Image src="/iink-logo.svg" alt="iink" width={80} height={26} className="h-[22px] w-auto" />
          <span className="ml-2 text-xs font-semibold tracking-[.12em] text-[#85847e]">ADMIN</span>
        </Link>
        {nav}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="관리자 메뉴">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-64 bg-[#0f1628] px-4 py-6">{nav}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-[#e9e7df] bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-[#e9e7df] lg:hidden"
            >
              <span className="flex w-4 flex-col gap-[4px]" aria-hidden="true">
                <span className="h-px w-4 bg-current" />
                <span className="h-px w-4 bg-current" />
                <span className="h-px w-4 bg-current" />
              </span>
            </button>
            <p className="text-sm text-[#85847e]">
              관리자 <span className="mx-1.5">/</span> <span className="text-[#3b3b3b]">{current.label}</span>
            </p>
          </div>
          <AccountMenu className="flex items-center gap-2" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
