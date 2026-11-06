'use client';

import Link from 'next/link';
import { logout, useSession } from '@/lib/auth';

// Header account spot: the icon leads to login; once logged in, the nickname and a log-out button.
export function AccountMenu({ icon }: { icon: React.ReactNode }) {
  const session = useSession();

  if (!session) {
    return (
      <Link href="/login" aria-label="Log in" className="transition-colors hover:text-[#1d2947]">
        {icon}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/results"
        className="text-[13px] font-semibold text-[#1d2947] underline-offset-4 transition-opacity hover:underline hover:opacity-70"
      >
        My results
      </Link>
      <span className="flex items-center gap-1.5 text-[14px] font-medium text-[#1d2947]">
        {icon}
        <span className="max-w-[120px] truncate max-[640px]:hidden">{session.member.memberNick}</span>
      </span>
      <button
        type="button"
        onClick={() => logout()}
        className="text-[13px] font-semibold text-[#1d2947] underline-offset-4 transition-opacity hover:underline hover:opacity-70"
      >
        Log out
      </button>
    </div>
  );
}
