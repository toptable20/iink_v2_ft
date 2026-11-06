import Image from 'next/image';
import Link from 'next/link';

// Survey intro — same look as the old live iink.co.kr/survey/create (old Survey/CoverPage/BasicInfo.vue).
export default function Start() {
  return (
    <main className="iink-old relative flex min-h-dvh flex-1 flex-col bg-[#FAF9F5]">
      <header className="flex h-[100px] items-center border-b border-[#3A3A3A] pl-[35px] max-[640px]:h-[70px] max-[640px]:pl-[25px]">
        <Link href="/" aria-label="iink home">
          <Image src="/brand/logo_small_2.png" alt="iink" width={206} height={63} priority className="h-auto w-[130px] max-[640px]:w-[100px]" />
        </Link>
      </header>

      <div className="mx-auto flex h-[80vh] w-[80%] items-center justify-center bg-[url('/brand/bg_ptn_2.png')] bg-contain bg-center bg-no-repeat text-center text-[38px] text-[#1A1A1A] max-[640px]:h-[75vh] max-[640px]:text-[22px]">
        <p>
          건강 상태 확인에 필요한<br className="min-[1081px]:hidden" /> 기본 정보를 물어볼게요!
        </p>
      </div>

      <div className="absolute bottom-[60px] flex h-[60px] w-full justify-center max-[640px]:bottom-[30px] max-[640px]:h-[45px]">
        <Link
          href="/quiz"
          className="flex w-1/2 items-center justify-center rounded-[10px] bg-[#B3E5C5] text-[24px] text-[#3A3A3A] max-[640px]:w-[45%] max-[640px]:text-[19px]"
        >
          다음
        </Link>
      </div>
    </main>
  );
}
