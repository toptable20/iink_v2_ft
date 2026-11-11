'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import { confirmAction, koreanError, showError } from '@/lib/alerts';
import {
  answerSmartQuiz,
  restartSmartQuiz,
  type SmartQuizState,
  type SmartQuizStep,
  startSmartQuiz,
  undoSmartQuiz,
} from '@/lib/smart-quiz';

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="m15 4-8 8 8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Quiz() {
  const router = useRouter();
  const [step, setStep] = useState<SmartQuizStep | null>(null);
  const [numberInput, setNumberInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const answerPending = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [resumed, setResumed] = useState(false);

  // draftAnswer: after going back, the removed answer (a code for choices, the number otherwise).
  const applyState = useCallback(
    (state: SmartQuizState, draftAnswer?: number | null) => {
      setSessionId(state.sessionId);
      setAnsweredCount(state.answeredCount);
      if (state.result) {
        // replace: back from the report must not land on the finished quiz again
        router.replace(`/results?id=${state.result._id}&saved=1`);
        return;
      }
      const question = state.step.question;
      if (!question) throw new Error('다음 질문을 불러오지 못했습니다.');
      setStep(state.step);
      setNumberInput(question.numeric && draftAnswer != null ? String(draftAnswer) : '');
      // The answer value is the code = option index + 1.
      setSelectedOption(!question.numeric && draftAnswer != null ? draftAnswer - 1 : null);
    },
    [router],
  );

  // errorTitle: shown as a pop-up when an action (answer / back / start over) fails; without it (loading the
  // quiz) the error stays on the page.
  const run = useCallback(
    async (action: () => Promise<SmartQuizState>, restoreLastAnswer = false, errorTitle?: string) => {
      setBusy(true);
      setError(null);
      try {
        const state = await action();
        applyState(state, restoreLastAnswer ? state.lastAnswerValue : undefined);
        return state;
      } catch (e) {
        if (errorTitle) void showError(errorTitle, e);
        else setError(koreanError(e instanceof Error ? e.message : String(e)));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [applyState],
  );

  useEffect(() => {
    void (async () => {
      if (!(await getAccessToken())) {
        setNeedLogin(true);
        return;
      }
      const state = await run(startSmartQuiz);
      if (state && state.answeredCount > 0) setResumed(true);
    })();
  }, [run]);

  function answer(value: number) {
    const id = step?.question?.id;
    if (!id || !sessionId || busy || answerPending.current) return;
    answerPending.current = true;
    setResumed(false);
    void run(() => answerSmartQuiz(sessionId, id, value), false, '답변을 저장하지 못했습니다').finally(() => {
      answerPending.current = false;
    });
  }

  function back() {
    if (!sessionId || !answeredCount || busy) return;
    setResumed(false);
    void run(() => undoSmartQuiz(sessionId), true, '이전 질문으로 돌아가지 못했습니다');
  }

  async function restart() {
    const ok = await confirmAction('처음부터 다시 할까요?', '지금까지 입력한 답변은 사용되지 않습니다.', '다시 시작');
    if (!ok) return;
    setStep(null);
    setSelectedOption(null);
    setNumberInput('');
    setResumed(false);
    void run(restartSmartQuiz, false, '퀴즈를 다시 시작하지 못했습니다');
  }

  if (needLogin) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-[#f8f7f2] px-6 text-center font-sans text-[#3b3b3b]">
        <p className="max-w-[420px] text-[17px] leading-relaxed">퀴즈를 진행하려면 로그인이 필요합니다.</p>
        <Link
          href="/login"
          className="flex min-h-[56px] w-full max-w-[420px] items-center justify-center rounded-[20px] bg-[#a9dfbd] px-5 text-[16px] font-semibold transition-colors hover:bg-[#91d3aa]"
        >
          로그인
        </Link>
      </main>
    );
  }

  const question = step?.question;
  const canGoBack = answeredCount > 0;
  const numeric = question?.numeric;
  const parsedNumber = Number(numberInput);
  // Same rules as the backend (v9ValidateAnswer): inside min–max; whole number when min is 1 (10_설문입력 K).
  const numberIsValid = Boolean(
    numberInput !== '' &&
      numeric &&
      Number.isFinite(parsedNumber) &&
      parsedNumber >= numeric.min &&
      parsedNumber <= numeric.max &&
      (numeric.min !== 1 || Number.isInteger(parsedNumber)),
  );
  const numberHint =
    numeric && numberInput !== '' && !numberIsValid
      ? numeric.min === 1 && Number.isFinite(parsedNumber) && !Number.isInteger(parsedNumber)
        ? '정수로 입력해 주세요.'
        : `${numeric.min}~${numeric.max} ${numeric.unit} 사이로 입력해 주세요.`
      : null;
  const progress = Math.min(100, Math.max(0, step?.progress ?? 0));

  return (
    <div className="min-h-screen w-full bg-[#f8f7f2] font-sans text-[#3b3b3b]">
      <header className="w-full">
        <div
          role="progressbar"
          aria-label="퀴즈 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-[5px] w-full bg-[#e4e3de]"
        >
          <div
            className="h-full bg-[#82cf9e] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mx-auto flex h-[76px] w-full max-w-[480px] items-center justify-between px-6">
          <button
            type="button"
            onClick={back}
            disabled={!canGoBack || busy}
            aria-label="이전 질문"
            className="grid h-11 w-11 place-items-center rounded-full text-[#3b3b3b] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft />
          </button>
          <Link
            href="/"
            aria-label="퀴즈 닫기"
            className="grid h-11 w-11 place-items-center rounded-full text-[#3b3b3b] transition hover:bg-black/5"
          >
            <CloseIcon />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-[480px] flex-col px-[26px] pb-8 pt-5 sm:px-8 sm:pt-8">
        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {resumed && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[#cfe8d8] bg-[#eef8f1] px-4 py-3 text-sm text-[#3d7a55]">
            <span>저장된 퀴즈를 이어서 진행합니다.</span>
            <button
              type="button"
              onClick={restart}
              disabled={busy}
              className="shrink-0 font-semibold underline-offset-4 hover:underline disabled:opacity-40"
            >
              처음부터 다시
            </button>
          </div>
        )}

        {!question ? (
          error && !busy ? (
            <div className="my-auto flex flex-col items-center gap-4 text-center">
              <p className="text-base text-[#777]">퀴즈를 불러오지 못했습니다.</p>
              <button
                type="button"
                onClick={() => void run(startSmartQuiz)}
                className="min-h-[56px] w-full max-w-[320px] rounded-[20px] bg-[#a9dfbd] px-5 text-[16px] font-semibold text-[#3b3b3b] transition-colors hover:bg-[#91d3aa]"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <p className="my-auto text-center text-base text-[#777]">퀴즈를 불러오는 중…</p>
          )
        ) : (
          <>
            <section aria-labelledby="quiz-question" className="flex flex-1 flex-col">
              <p className="mb-4 text-lg font-semibold text-[#82c99c]">진행률 약 {progress}%</p>
              <h1 id="quiz-question" className="m-0 text-[30px] font-medium leading-[1.25] tracking-[-.025em] text-[#3b3b3b] sm:text-[34px]">
                {question.text}
              </h1>

              {numeric ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (numberIsValid) answer(parsedNumber);
                  }}
                  className="mt-10 flex flex-1 flex-col"
                >
                  <label className="sr-only" htmlFor="quiz-number">{question.text}</label>
                  <div className="flex min-h-[76px] items-center rounded-[20px] border border-[#c9c9c5] bg-[#fbfaf7] px-6 focus-within:border-[#82c99c] focus-within:ring-2 focus-within:ring-[#82c99c]/20">
                    <input
                      id="quiz-number"
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      // any decimal is allowed; the whole-number rule (min 1) is checked by numberIsValid
                      step="any"
                      min={numeric.min}
                      max={numeric.max}
                      value={numberInput}
                      onChange={(event) => setNumberInput(event.target.value)}
                      disabled={busy}
                      className="h-full w-full bg-transparent text-[20px] text-[#3b3b3b] outline-none placeholder:text-[#9b9b96]"
                      placeholder={`${numeric.min}–${numeric.max}`}
                    />
                    <span className="ml-3 shrink-0 text-[18px] text-[#74746f]">{numeric.unit}</span>
                  </div>
                  {numberHint && (
                    <p role="alert" className="mt-3 px-2 text-sm text-rose-600">
                      {numberHint}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!numberIsValid || busy}
                    className="mt-auto min-h-[70px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[19px] font-medium text-[#3b3b3b] transition-colors hover:bg-[#91d3aa] disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#999]"
                  >
                    {busy ? '불러오는 중…' : '다음 질문'}
                  </button>
                </form>
              ) : (
                <div className="mt-9 flex flex-1 flex-col">
                  <div className="flex flex-col gap-3.5">
                    {(question.options ?? []).map((option, index) => {
                      const selected = selectedOption === index;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedOption(index)}
                          disabled={busy}
                          className={`min-h-[74px] w-full rounded-[20px] border px-5 text-left text-[18px] transition-colors disabled:cursor-not-allowed ${
                            selected
                              ? 'border-[#a9dfbd] bg-[#a9dfbd] text-[#3b3b3b]'
                              : 'border-[#d2d1cc] bg-transparent text-[#555550] hover:bg-white/70'
                          }`}
                        >
                          {option.replace(/\s+/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={selectedOption === null || busy}
                    onClick={() => selectedOption !== null && answer(selectedOption + 1)}
                    className="mt-auto min-h-[70px] w-full rounded-[20px] bg-[#a9dfbd] px-5 text-[19px] font-medium text-[#3b3b3b] transition-colors hover:bg-[#91d3aa] disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#999]"
                  >
                    {busy ? '불러오는 중…' : '다음 질문'}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
