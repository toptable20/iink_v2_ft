import Image from 'next/image';
import Link from 'next/link';

export const authInput =
  'mt-1.5 w-full rounded-xl border border-[#d9d2cb] bg-white px-4 py-3 text-[15px] text-[#1d2947] placeholder:text-[#a3a8b3] focus:border-[#1d2947] focus:outline-none';

export const authButton =
  'inline-flex min-h-[51px] w-full items-center justify-center rounded-full border border-[#1d2947] bg-[#1d2947] px-[25px] text-[15px] font-semibold text-white transition duration-200 hover:bg-[#2a3a60] disabled:cursor-not-allowed disabled:opacity-50';

export function authErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  const translations: Record<string, string> = {
    'No member with that member nick!': '해당 닉네임의 회원을 찾을 수 없습니다.',
    'Wrong password, try again!': '비밀번호가 올바르지 않습니다. 다시 확인해 주세요.',
    'You have been blocked!': '계정 이용이 제한되었습니다. 고객센터에 문의해 주세요.',
    'Please verify your email before logging in': '로그인하려면 이메일 인증이 필요합니다.',
    'Used Member Nick or Phone!': '이미 사용 중인 닉네임 또는 휴대폰 번호입니다.',
  };

  if (translations[message]) return translations[message];
  if (message.startsWith('Cannot reach the iink server at ')) {
    return '서버에 연결할 수 없습니다. 서버 상태와 네트워크를 확인해 주세요.';
  }
  return message || fallback;
}

// Page frame for login and signup. Background = old iink.co.kr home (beige + green arcs).
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-[#FAF9F5] bg-[url('/brand/iink_main.png')] bg-cover bg-top bg-no-repeat px-4 py-10 font-sans text-[#1d2947]">
      <Link href="/" className="mb-8 mt-2">
        <Image src="/iink-logo.svg" alt="iink home" width={97} height={30} priority className="h-[30px] w-auto" />
      </Link>
      <div className="w-full max-w-[440px] rounded-3xl bg-white/95 p-7 shadow-[0_16px_40px_rgba(81,45,52,.12)] sm:p-10">
        <h1 className="m-0 text-[28px] font-semibold tracking-[-.03em]">{title}</h1>
        <p className="mt-2 mb-7 text-[14px] leading-[1.6] text-[#687080]">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold">
      {label}
      {children}
      {hint && <span className="mt-1 block text-[12px] font-normal text-[#8a909b]">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="whitespace-pre-line rounded-xl bg-[#fdecec] px-4 py-3 text-[13px] text-[#b42318]">
      {message}
    </p>
  );
}
