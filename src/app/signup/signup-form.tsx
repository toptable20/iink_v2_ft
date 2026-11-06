'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NICK_LENGTH, PASSWORD_LENGTH, PHONE_PATTERN, signup, useSession } from '@/lib/auth';
import { authButton, authInput, Field, FormError } from '../auth-ui';
import { PasswordInput } from '../password-input';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the backend, checked before sending so the member sees a clear message.
function validate(nick: string, phone: string, password: string, confirm: string, email: string): string | null {
  if (nick.length < NICK_LENGTH.min || nick.length > NICK_LENGTH.max) {
    return `Nickname must be ${NICK_LENGTH.min}–${NICK_LENGTH.max} characters.`;
  }
  if (!PHONE_PATTERN.test(phone)) return 'Phone number must be 7–15 digits, e.g. 01012345678.';
  if (password.length < PASSWORD_LENGTH.min || password.length > PASSWORD_LENGTH.max) {
    return `Password must be ${PASSWORD_LENGTH.min}–${PASSWORD_LENGTH.max} characters.`;
  }
  if (password !== confirm) return 'The two passwords are not the same.';
  if (email && !EMAIL_PATTERN.test(email)) return 'Email address is not valid.';
  return null;
}

export function SignupForm() {
  const router = useRouter();
  const session = useSession();
  const [memberNick, setMemberNick] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
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
    const nick = memberNick.trim();
    const phone = memberPhone.replace(/[\s-]/g, ''); // 010-1234-5678 → 01012345678
    const email = memberEmail.trim();
    const problem = validate(nick, phone, memberPassword, confirmPassword, email);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await signup({ memberNick: nick, memberPhone: phone, memberPassword, ...(email ? { memberEmail: email } : {}) });
      router.replace('/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Nickname" hint={`${NICK_LENGTH.min}–${NICK_LENGTH.max} characters. You log in with it.`}>
        <input
          className={authInput}
          value={memberNick}
          onChange={(e) => setMemberNick(e.target.value)}
          autoComplete="username"
          maxLength={NICK_LENGTH.max}
        />
      </Field>
      <Field label="Phone number">
        <input
          className={authInput}
          type="tel"
          inputMode="tel"
          value={memberPhone}
          onChange={(e) => setMemberPhone(e.target.value)}
          placeholder="010-1234-5678"
          autoComplete="tel"
        />
      </Field>
      <Field label="Password" hint={`${PASSWORD_LENGTH.min}–${PASSWORD_LENGTH.max} characters.`}>
        <PasswordInput
          value={memberPassword}
          onChange={(e) => setMemberPassword(e.target.value)}
          autoComplete="new-password"
          maxLength={PASSWORD_LENGTH.max}
        />
      </Field>
      <Field label="Confirm password">
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          maxLength={PASSWORD_LENGTH.max}
        />
      </Field>
      <Field label="Email (optional)">
        <input
          className={authInput}
          type="email"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          autoComplete="email"
        />
      </Field>
      <FormError message={error} />
      <button
        type="submit"
        className={authButton}
        disabled={busy || !memberNick.trim() || !memberPhone.trim() || !memberPassword || !confirmPassword}
      >
        {busy ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-[14px] text-[#687080]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[#1d2947] underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
