import { RESULT_FIELDS, type SmartQuizResult, type SmartQuizStep } from './smart-quiz';
import type { Checkup, CompleteResult, StartInput } from './nhis';
import type { LinkCode, LinkStatus, WearableDay } from './wearables';

// Guest mode (team leader 2026-11-20): no login, NOTHING is saved on the server.
// The browser keeps the answers, the NHIS checkup years and the watch days in memory (React state only, not even
// localStorage) and sends them each time; the backend runs the same V9 engine and returns the result.
// Closing or reloading the page loses everything.

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export interface GuestAnswer {
  questionId: string;
  value: number;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/graphql`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
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

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, init);
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `API error ${res.status}`);
  return body as T;
}

export async function guestStep(answers: GuestAnswer[]): Promise<SmartQuizStep> {
  const data = await gql<{ guestSmartQuizStep: SmartQuizStep }>(
    `query GuestStep($answers: [SmartQuizGuestAnswerInput!]!) { guestSmartQuizStep(answers: $answers) { done progress question { id text options numeric { min max unit } } } }`,
    { answers },
  );
  return data.guestSmartQuizStep;
}

// checkup / watch: what the guest connected (null = not connected). Sent as JSON, used for this result only.
export async function guestResult(answers: GuestAnswer[], checkup: Checkup[] | null, watch: WearableDay[] | null): Promise<SmartQuizResult> {
  const data = await gql<{ guestSmartQuizResult: SmartQuizResult }>(
    `query GuestResult($answers: [SmartQuizGuestAnswerInput!]!, $checkup: String, $watch: String) { guestSmartQuizResult(answers: $answers, checkup: $checkup, watch: $watch) { ${RESULT_FIELDS} } }`,
    { answers, checkup: checkup ? JSON.stringify(checkup) : null, watch: watch ? JSON.stringify(watch) : null },
  );
  return data.guestSmartQuizResult;
}

// One step: the request stays open until the person approves on their phone. The years come back to the browser only.
export const guestNhisLookup = (input: StartInput) =>
  rest<CompleteResult>('nhis/guest/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });

// The watch link lives in the server's memory for 2 hours, never in the database.
export const guestLinkCode = () => rest<LinkCode>('wearables/guest/link-code', { method: 'POST' });
export const guestLinkStatus = (linkId: string) => rest<LinkStatus>(`wearables/guest/${encodeURIComponent(linkId)}`, { cache: 'no-store' });
