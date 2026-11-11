'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logout, useSession } from '@/lib/auth';

export function AccountMenu() {
  const session = useSession();
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
      <nav aria-label="Account" className="absolute right-5 top-5 z-20 sm:right-9 sm:top-8">
        <Link
          href="/login"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[#42624c]/25 bg-white/85 px-5 text-sm font-semibold text-[#263c2d] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        >
          로그인 <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    );
  }

  const initial = Array.from(session.member.memberNick.trim())[0]?.toLocaleUpperCase() ?? '?';

  return (
    <nav aria-label="Account" className="absolute right-5 top-5 z-20 flex items-center gap-2.5 sm:right-9 sm:top-8">
      <Link
        href="/results"
        className="inline-flex h-11 items-center rounded-full border border-[#42624c]/25 bg-white/85 px-5 text-sm font-semibold text-[#263c2d] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
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
          className="grid size-11 place-items-center rounded-full bg-[#2e5038] text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#24432e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c936a]"
        >
          {initial}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 top-full mt-2.5 min-w-40 rounded-2xl border border-[#263c2d]/10 bg-white p-2 shadow-xl shadow-black/10">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#263c2d] transition hover:bg-[#eff5ef]"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
