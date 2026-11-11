'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, useSession } from '@/lib/auth';
import { authButton, authErrorMessage, authInput, Field, FormError } from '../auth-ui';
import { PasswordInput } from '../password-input';

export function LoginForm() {
  const router = useRouter();
  const session = useSession();
  const [memberNick, setMemberNick] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    return (
      <div className="space-y-5">
        <p className="text-[15px]">
          <strong>{session.member.memberNick}</strong> 님으로 로그인되어 있습니다.
        </p>
        <Link href="/" className={authButton}>
          홈으로 가기
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ memberNick: memberNick.trim(), memberPassword });
      router.replace('/');
    } catch (err) {
      setError(authErrorMessage(err, '로그인에 실패했습니다. 다시 시도해 주세요.'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="닉네임">
        <input
          className={authInput}
          value={memberNick}
          onChange={(e) => setMemberNick(e.target.value)}
          autoComplete="username"
          required
        />
      </Field>
      <Field label="비밀번호">
        <PasswordInput
          value={memberPassword}
          onChange={(e) => setMemberPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      <FormError message={error} />
      <button type="submit" className={authButton} disabled={busy || !memberNick.trim() || !memberPassword}>
        {busy ? '로그인 중…' : '로그인'}
      </button>
      <p className="text-center text-[14px] text-[#687080]">
        아직 회원이 아니신가요?{' '}
        <Link href="/signup" className="font-semibold text-[#1d2947] underline-offset-4 hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
