'use client';

import { useRouter } from 'next/navigation';
import { logout, useSession } from '@/lib/auth';

// Pages that save health data: shows whose account it goes to, so someone using another
// person's browser can log out first instead of saving into their account.
export function LoggedInAs({ korean = false }: { korean?: boolean }) {
  const router = useRouter();
  const session = useSession();
  if (!session) return null;

  async function switchAccount() {
    await logout();
    router.push('/login');
  }

  const nick = <strong className="font-semibold">{session.member.memberNick}</strong>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>
        {korean ? <>{nick} 님 계정에 저장됩니다. 본인이 맞나요?</> : <>Saving to {nick}&apos;s account. Is this you?</>}
      </span>
      <button type="button" onClick={switchAccount} className="font-semibold underline underline-offset-4">
        {korean ? '본인이 아니면 로그아웃' : 'Not me: log out'}
      </button>
    </div>
  );
}
