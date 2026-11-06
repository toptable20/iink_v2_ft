'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Answers, fetchNext, fetchReport, type NextStep, type Report } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { createMyHealthReport } from '@/lib/health-report';
import {
  answerQuizQuestion,
  type QuizSessionState,
  restartQuizSession,
  startQuizSession,
  undoLastQuizAnswer,
} from '@/lib/quiz-session';
import { LoggedInAs } from './logged-in-as';
import { ReportView } from './report-view';

type Stage = 'quiz' | 'report';

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
  const [stage, setStage] = useState<Stage>('quiz');
  const [answers, setAnswers] = useState<Answers>({});
  const [order, setOrder] = useState<string[]>([]);
  const [step, setStep] = useState<NextStep | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [numberInput, setNumberInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answerPending = useRef(false);
  // Logged-in members: the quiz is saved on the server after every answer (sessionId set).
  // Guests: answers stay in this page and nothing is saved (sessionId null).
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [saved, setSaved] = useState(false);

  const applySaved = useCallback((state: QuizSessionState, draftAnswer?: number | null) => {
    setSessionId(state.sessionId);
    setAnsweredCount(state.answeredCount);
    if (state.report) {
      setReport(state.report);
      setSaved(true);
      setStage('report');
      // Then the combined result (quiz + connected NHIS/watch data); the quiz report stays if it fails.
      createMyHealthReport()
        .then(setReport)
        .catch((e: Error) => console.error('[report] combined result was not created:', e.message));
      return;
    }
    const question = state.step.question;
    if (!question) throw new Error('The quiz did not return a question.');
    setStep(state.step);
    setNumberInput(question.numeric && draftAnswer != null ? String(draftAnswer) : '');
    setSelectedOption(!question.numeric && draftAnswer != null ? draftAnswer : null);
    setStage('quiz');
  }, []);

  const runSaved = useCallback(
    async (action: () => Promise<QuizSessionState>, restoreLastAnswer = false) => {
      setBusy(true);
      setError(null);
      try {
        const state = await action();
        applySaved(state, restoreLastAnswer ? state.lastAnswerValue : undefined);
        return state;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [applySaved],
  );

  const load = useCallback(async (nextAnswers: Answers, nextOrder: string[], draftAnswer?: number) => {
    setBusy(true);
    setError(null);
    try {
      const nextStep = await fetchNext(nextAnswers);
      setAnswers(nextAnswers);
      setOrder(nextOrder);
      if (nextStep.done) {
        setReport(await fetchReport(nextAnswers));
        setStage('report');
      } else if (nextStep.question) {
        setStep(nextStep);
        setNumberInput(nextStep.question.numeric && draftAnswer !== undefined ? String(draftAnswer) : '');
        setSelectedOption(!nextStep.question.numeric && draftAnswer !== undefined ? draftAnswer : null);
        setStage('quiz');
      } else {
        throw new Error('The quiz did not return a question.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      if (await getAccessToken()) {
        const state = await runSaved(startQuizSession);
        if (state && state.answeredCount > 0) setResumed(true);
      } else {
        await load({}, []);
      }
    })();
  }, [load, runSaved]);

  function answer(value: number) {
    const id = step?.question?.id;
    if (!id || busy || answerPending.current) return;
    answerPending.current = true;
    setResumed(false);
    const done = sessionId
      ? runSaved(() => answerQuizQuestion(sessionId, id, value))
      : load({ ...answers, [id]: value }, [...order, id]);
    void done.finally(() => {
      answerPending.current = false;
    });
  }

  function back() {
    if (sessionId) {
      if (!answeredCount || busy) return;
      setResumed(false);
      void runSaved(() => undoLastQuizAnswer(sessionId), true);
      return;
    }
    const last = order.at(-1);
    if (!last || busy) return;
    const previousAnswers = { ...answers };
    const draftAnswer = previousAnswers[last];
    delete previousAnswers[last];
    void load(previousAnswers, order.slice(0, -1), draftAnswer);
  }

  function restart() {
    setReport(null);
    setStep(null);
    setAnswers({});
    setOrder([]);
    setSelectedOption(null);
    setNumberInput('');
    setSaved(false);
    setResumed(false);
    setStage('quiz');
    if (sessionId) void runSaved(restartQuizSession);
    else void load({}, []);
  }

  if (stage === 'report' && report) return <ReportView report={report} onRestart={restart} saved={saved} />;

  const question = step?.question;
  const currentQuestionNumber = (sessionId ? answeredCount : order.length) + 1;
  const canGoBack = sessionId ? answeredCount > 0 : order.length > 0;
  const numeric = question?.numeric;
  const parsedNumber = Number(numberInput);
  const numberIsValid = Boolean(
    numberInput !== '' && numeric && parsedNumber >= numeric.min && parsedNumber <= numeric.max,
  );
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

        {/* At the start (or when continuing), so a quiz isn't saved into someone else's account. */}
        {sessionId && (answeredCount === 0 || resumed) && (
          <div className="mb-6">
            <LoggedInAs korean />
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
          <p className="my-auto text-center text-base text-[#777]">퀴즈를 불러오는 중…</p>
        ) : (
          <>
            <section aria-labelledby="quiz-question" className="flex flex-1 flex-col">
              <p className="mb-4 text-lg font-semibold text-[#82c99c]">
                질문 {currentQuestionNumber}
              </p>
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
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={selectedOption === null || busy}
                    onClick={() => selectedOption !== null && answer(selectedOption)}
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
