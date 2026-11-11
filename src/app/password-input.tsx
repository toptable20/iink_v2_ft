'use client';

import { useState } from 'react';
import { authInput } from './auth-ui';

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {!open && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

// Password field with an eye button that shows or hides what is typed.
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <input {...props} type={visible ? 'text' : 'password'} className={`${authInput} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-pressed={visible}
        className="absolute top-1/2 right-3 mt-[3px] -translate-y-1/2 rounded-md p-1 text-[#8a909b] transition-colors hover:text-[#1d2947] focus-visible:text-[#1d2947] focus-visible:outline-none"
      >
        <EyeIcon open={visible} />
      </button>
    </span>
  );
}
