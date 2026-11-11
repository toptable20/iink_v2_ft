import type { NextStep, Report } from './api';
import { getAccessToken } from './auth';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

// Saved quiz for logged-in members (backend: quiz.resolver.ts). Guests use the stateless calls in api.ts.

export interface SavedReport extends Report {
  _id: string;
  createdAt: string;
}

export interface QuizSessionState {
  sessionId: string;
  answeredCount: number;
  step: NextStep;
  report: SavedReport | null;
  // After going back: the removed answer, shown selected again.
  lastAnswerValue: number | null;
}

export const REPORT_FIELDS = `_id createdAt
  profile { sex sexLabel age heightCm weightKg bmi bmiBand { key label labelKo } }
  consumption { nutrients { key group label labelKo unit dailyAmount sources { questionId food sharePercent } } notes }
  topics { topics { key label labelKo level diagramLevel reasons { feature attentionPercent } } notes }
  safety { questionId question answer needsReview }`;

const STATE_FIELDS = `session { _id answers { questionId } }
  step { done progress question { id text options numeric { min max unit } } }
  report { ${REPORT_FIELDS} }
  lastAnswerValue`;

interface RawState {
  session: { _id: string; answers: { questionId: string }[] };
  step: NextStep;
  report: SavedReport | null;
  lastAnswerValue: number | null;
}

// GraphQL call as the logged-in member.
export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  let res: Response;
  try {
    res = await fetch(`${API}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
  }
  const body = await res.json().catch(() => ({}));
  if (body.errors?.length) {
    const message = body.errors[0].message;
    throw new Error(Array.isArray(message) ? message.join('\n') : (message ?? 'Request failed'));
  }
  if (!res.ok || !body.data) throw new Error('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return body.data as T;
}

const toState = (raw: RawState): QuizSessionState => ({
  sessionId: raw.session._id,
  answeredCount: raw.session.answers.length,
  step: raw.step,
  report: raw.report,
  lastAnswerValue: raw.lastAnswerValue,
});

// Continues the member's unfinished quiz, or starts a new one.
export async function startQuizSession(): Promise<QuizSessionState> {
  const data = await gql<{ startQuizSession: RawState }>(`mutation { startQuizSession { ${STATE_FIELDS} } }`);
  return toState(data.startQuizSession);
}

export async function restartQuizSession(): Promise<QuizSessionState> {
  const data = await gql<{ restartQuizSession: RawState }>(`mutation { restartQuizSession { ${STATE_FIELDS} } }`);
  return toState(data.restartQuizSession);
}

export async function answerQuizQuestion(sessionId: string, questionId: string, value: number): Promise<QuizSessionState> {
  const data = await gql<{ answerQuizQuestion: RawState }>(
    `mutation Answer($input: QuizAnswerInput!) { answerQuizQuestion(input: $input) { ${STATE_FIELDS} } }`,
    { input: { sessionId, questionId, value } },
  );
  return toState(data.answerQuizQuestion);
}

export async function undoLastQuizAnswer(sessionId: string): Promise<QuizSessionState> {
  const data = await gql<{ undoLastQuizAnswer: RawState }>(
    `mutation Undo($sessionId: String!) { undoLastQuizAnswer(sessionId: $sessionId) { ${STATE_FIELDS} } }`,
    { sessionId },
  );
  return toState(data.undoLastQuizAnswer);
}

export async function getMyQuizReports(page = 1, limit = 20): Promise<{ list: SavedReport[]; total: number }> {
  const data = await gql<{ getMyQuizReports: { list: SavedReport[]; metaData: { total: number } } }>(
    `query MyReports($input: QuizReportsInquiry!) { getMyQuizReports(input: $input) { list { ${REPORT_FIELDS} } metaData { total } } }`,
    { input: { page, limit } },
  );
  return { list: data.getMyQuizReports.list, total: data.getMyQuizReports.metaData.total };
}
