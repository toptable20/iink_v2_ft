import Image from 'next/image';
import Link from 'next/link';
import { AccountMenu } from './account-menu';

const navigation = [
  { href: '/', label: '홈' },
  { href: '/quiz', label: '영양 분석' },
  { href: '/checkup', label: '건강검진 연결' },
  { href: '/devices', label: '워치 연결' },
];

export default function Home() {
  return (
    <main className="home-reference-landing relative flex min-h-svh flex-col overflow-hidden bg-[#0f1628] text-white">
      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
        <details className="group relative z-30">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-3 rounded-full border border-white/15 px-3 text-xs font-semibold tracking-[.14em] text-white/90 transition hover:bg-white/10 [&::-webkit-details-marker]:hidden sm:px-4">
            <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true">
              <span className="h-px w-5 bg-current" />
              <span className="h-px w-3 bg-current transition-all group-open:w-5" />
            </span>
            <span className="hidden sm:inline">MENU</span>
          </summary>
          <nav aria-label="주 메뉴" className="absolute left-0 top-full mt-3 flex min-w-52 flex-col rounded-2xl border border-white/10 bg-[#162233] p-2 shadow-2xl shadow-black/30">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </details>

        <Link href="/" aria-label="iink 홈" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image src="/iink-logo.svg" alt="iink" width={118} height={38} priority className="h-[29px] w-auto brightness-0 invert sm:h-[34px]" />
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div aria-label="언어 선택" className="hidden items-center rounded-full border border-white/15 p-1 text-[11px] font-semibold tracking-[.08em] sm:flex">
            <span className="rounded-full px-2.5 py-1 text-white/45">ENG</span>
            <span aria-current="true" className="rounded-full bg-white/10 px-2.5 py-1 text-white">KOR</span>
          </div>
          <AccountMenu variant="dark" className="flex items-center gap-2" />
          <Link href="/quiz" aria-label="나만의 분석 시작" className="grid size-10 place-items-center rounded-full bg-[#0d79ea] text-white shadow-lg shadow-blue-950/30 transition hover:bg-[#2788f0] sm:hidden">
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/quiz" className="hidden min-h-10 items-center gap-2 rounded-full bg-[#0d79ea] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-[#2788f0] sm:inline-flex">
            분석 시작 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-4 px-6 pb-10 pt-8 sm:px-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:px-16 lg:pb-14 lg:pt-6">
        <div className="relative z-10 mx-auto w-full max-w-[650px] text-center lg:mx-0 lg:text-left">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-2 text-[10px] font-semibold tracking-[.2em] text-[#8abfff] sm:text-xs">
            <span className="size-1.5 rounded-full bg-[#0d79ea] shadow-[0_0_14px_#0d79ea]" />
            PERSONAL NUTRITION, REIMAGINED
          </p>
          <h1 className="text-[42px] font-semibold leading-[1.14] tracking-[-.045em] text-white sm:text-[56px] lg:text-[68px]">
            나를 이해하는 순간,
            <br />
            <span className="text-[#8abfff]">영양이 달라집니다.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[510px] text-[15px] leading-7 text-white/60 sm:mt-6 sm:text-[17px] sm:leading-8 lg:mx-0">
            생활 습관과 건강 데이터를 바탕으로 지금 나에게 필요한 영양 관리 방향을 확인해 보세요.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 min-[440px]:flex-row lg:justify-start">
            <Link href="/quiz" className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-[#0d79ea] px-7 text-[15px] font-semibold text-white shadow-[0_12px_36px_rgba(13,121,234,.24)] transition hover:-translate-y-0.5 hover:bg-[#2788f0]">
              나만의 분석 시작하기 <span className="text-lg" aria-hidden="true">→</span>
            </Link>
            <Link href="/checkup" className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/15 px-7 text-[15px] font-medium text-white/80 transition hover:border-white/30 hover:bg-white/[.05] hover:text-white">
              건강 데이터 연결
            </Link>
          </div>
          <p className="mt-5 text-xs tracking-wide text-white/35">간단한 질문으로 시작하는 나만의 영양 분석</p>
        </div>

        <div aria-hidden="true" className="relative mx-auto mt-5 aspect-square w-full max-w-[510px] lg:mt-0 lg:max-w-[620px]">
          <div className="absolute inset-[8%] rounded-full border border-white/[.09]" />
          <div className="absolute inset-[18%] rounded-full border border-white/[.12]" />
          <div className="absolute inset-[29%] rounded-full border border-[#0d79ea]/35" />
          <div className="absolute inset-[36%] rounded-full bg-[radial-gradient(circle_at_42%_35%,rgba(13,121,234,.36),rgba(13,121,234,.08)_48%,rgba(255,255,255,.02)_75%)] shadow-[0_0_100px_rgba(13,121,234,.16)]" />
          <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full" fill="none">
            <defs>
              <linearGradient id="nutritionLine" x1="102" y1="141" x2="503" y2="468" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0d79ea" stopOpacity=".12" />
                <stop offset=".5" stopColor="#8abfff" stopOpacity=".76" />
                <stop offset="1" stopColor="#0d79ea" stopOpacity=".18" />
              </linearGradient>
              <radialGradient id="nutritionCore" cx="0" cy="0" r="1" gradientTransform="matrix(0 126 -126 0 300 300)" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0d79ea" stopOpacity=".42" />
                <stop offset="1" stopColor="#0d79ea" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="300" cy="300" r="126" fill="url(#nutritionCore)" />
            <g stroke="url(#nutritionLine)" strokeWidth="1.3">
              <path d="m300 300-155-152 158-48 154 122-24 206-159 85-166-115 37-250" />
              <path d="m145 148 288 74-299 135 299 71M303 100l-7 350m161-228-323 20m323-20L134 351" />
              <circle cx="300" cy="300" r="162" strokeDasharray="3 10" />
            </g>
            <g fill="#0f1628" stroke="#8abfff" strokeWidth="2">
              <circle cx="145" cy="148" r="11" /><circle cx="303" cy="100" r="9" />
              <circle cx="457" cy="222" r="13" /><circle cx="433" cy="428" r="10" />
              <circle cx="274" cy="513" r="12" /><circle cx="108" cy="398" r="9" />
              <circle cx="134" cy="351" r="7" /><circle cx="296" cy="450" r="7" />
            </g>
            <circle cx="300" cy="300" r="7" fill="#fff" />
            <circle cx="300" cy="300" r="19" stroke="#8abfff" strokeOpacity=".5" />
          </svg>
          <div className="absolute left-[1%] top-[24%] rounded-2xl border border-white/10 bg-[#162233]/90 px-3.5 py-3 shadow-xl shadow-black/20 backdrop-blur sm:left-0 sm:px-4">
            <p className="text-[9px] font-semibold tracking-[.16em] text-white/40 sm:text-[10px]">ENERGY</p>
            <p className="mt-1 text-sm font-semibold text-white sm:text-base">나의 활력</p>
          </div>
          <div className="absolute right-[1%] top-[37%] rounded-2xl border border-white/10 bg-[#162233]/90 px-3.5 py-3 shadow-xl shadow-black/20 backdrop-blur sm:right-0 sm:px-4">
            <p className="text-[9px] font-semibold tracking-[.16em] text-white/40 sm:text-[10px]">BALANCE</p>
            <p className="mt-1 text-sm font-semibold text-white sm:text-base">영양 균형</p>
          </div>
          <div className="absolute bottom-[11%] left-[22%] rounded-2xl border border-white/10 bg-[#162233]/90 px-3.5 py-3 shadow-xl shadow-black/20 backdrop-blur sm:left-[24%] sm:px-4">
            <p className="text-[9px] font-semibold tracking-[.16em] text-white/40 sm:text-[10px]">WELLNESS</p>
            <p className="mt-1 text-sm font-semibold text-white sm:text-base">나만의 건강 지도</p>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-5 left-6 hidden text-[10px] font-medium tracking-[.2em] text-white/30 lg:block">IINK · PERSONAL NUTRITION</div>
    </main>
  );
}
