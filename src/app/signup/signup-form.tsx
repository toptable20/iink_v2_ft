'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NICK_LENGTH, PASSWORD_LENGTH, PHONE_PATTERN, signup, useSession } from '@/lib/auth';
import { authButton, authErrorMessage, authInput, Field, FormError } from '../auth-ui';
import { PasswordInput } from '../password-input';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the backend, checked before sending so the member sees a clear message.
function validate(nick: string, phone: string, password: string, confirm: string, email: string): string | null {
  if (nick.length < NICK_LENGTH.min || nick.length > NICK_LENGTH.max) {
    return `닉네임은 ${NICK_LENGTH.min}~${NICK_LENGTH.max}자로 입력해 주세요.`;
  }
  if (!PHONE_PATTERN.test(phone)) return '휴대폰 번호를 숫자 7~15자리로 입력해 주세요. 예: 01012345678';
  if (password.length < PASSWORD_LENGTH.min || password.length > PASSWORD_LENGTH.max) {
    return `비밀번호는 ${PASSWORD_LENGTH.min}~${PASSWORD_LENGTH.max}자로 입력해 주세요.`;
  }
  if (password !== confirm) return '비밀번호가 일치하지 않습니다.';
  if (email && !EMAIL_PATTERN.test(email)) return '올바른 이메일 주소를 입력해 주세요.';
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
      setError(authErrorMessage(err, '회원가입에 실패했습니다. 다시 시도해 주세요.'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="닉네임" hint={`${NICK_LENGTH.min}~${NICK_LENGTH.max}자 · 로그인할 때 사용합니다.`}>
        <input
          className={authInput}
          value={memberNick}
          onChange={(e) => setMemberNick(e.target.value)}
          autoComplete="username"
          maxLength={NICK_LENGTH.max}
        />
      </Field>
      <Field label="휴대폰 번호">
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
      <Field label="비밀번호" hint={`${PASSWORD_LENGTH.min}~${PASSWORD_LENGTH.max}자`}>
        <PasswordInput
          value={memberPassword}
          onChange={(e) => setMemberPassword(e.target.value)}
          autoComplete="new-password"
          maxLength={PASSWORD_LENGTH.max}
        />
      </Field>
      <Field label="비밀번호 확인">
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          maxLength={PASSWORD_LENGTH.max}
        />
      </Field>
      <Field label="이메일 (선택)">
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
        {busy ? '가입 중…' : '회원가입'}
      </button>
      <p className="text-center text-[14px] text-[#687080]">
        이미 회원이신가요?{' '}
        <Link href="/login" className="font-semibold text-[#1d2947] underline-offset-4 hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
