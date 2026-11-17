'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logout, useSession } from '@/lib/auth';

export function AccountMenu({
  className,
  variant = 'light',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  const session = useSession();
  const dark = variant === 'dark';
  const navClass = className ?? 'absolute right-5 top-5 z-20 sm:right-9 sm:top-8';
  const actionClass = dark
    ? 'inline-flex h-10 items-center rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/[0.08]'
    : 'inline-flex h-11 items-center rounded-full border border-[#42624c]/25 bg-white/85 px-5 text-sm font-semibold text-[#263c2d] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md';
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  if (!session) {
    return (
      <nav aria-label="Account" className={navClass}>
        <Link
          href="/login"
          className={`${actionClass} gap-2`}
        >
          로그인 <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    );
  }

  const initial = Array.from(session.member.memberNick.trim())[0]?.toLocaleUpperCase() ?? '?';

  return (
    <nav aria-label="Account" className={`${navClass} flex items-center gap-2`}>
      <Link
        href="/results"
        className={actionClass}
      >
        내 결과
      </Link>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label={`Account menu for ${session.member.memberNick}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={dark
            ? 'grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d79ea]'
            : 'grid size-11 place-items-center rounded-full bg-[#2e5038] text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#24432e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c936a]'}
        >
          {initial}
        </button>
        {open && (
          <div role="menu" className={`absolute right-0 top-full mt-2.5 min-w-40 rounded-2xl border p-2 shadow-xl ${dark ? 'border-white/10 bg-[#162233] shadow-black/30' : 'border-[#263c2d]/10 bg-white shadow-black/10'}`}>
            {session.member.memberType === 'ADMIN' && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${dark ? 'text-white hover:bg-white/10' : 'text-[#263c2d] hover:bg-[#eff5ef]'}`}
              >
                관리자 페이지
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${dark ? 'text-white hover:bg-white/10' : 'text-[#263c2d] hover:bg-[#eff5ef]'}`}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
