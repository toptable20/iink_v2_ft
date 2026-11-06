'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, useSession } from '@/lib/auth';
import { authButton, authInput, Field, FormError } from '../auth-ui';
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
          You are logged in as <strong>{session.member.memberNick}</strong>.
        </p>
        <Link href="/" className={authButton}>
          Go to home
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
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Nickname">
        <input
          className={authInput}
          value={memberNick}
          onChange={(e) => setMemberNick(e.target.value)}
          autoComplete="username"
          required
        />
      </Field>
      <Field label="Password">
        <PasswordInput
          value={memberPassword}
          onChange={(e) => setMemberPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      <FormError message={error} />
      <button type="submit" className={authButton} disabled={busy || !memberNick.trim() || !memberPassword}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="text-center text-[14px] text-[#687080]">
        New to iink?{' '}
        <Link href="/signup" className="font-semibold text-[#1d2947] underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
