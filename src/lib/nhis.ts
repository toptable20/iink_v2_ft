import { getAccessToken } from './auth';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export type HyphenMode = 'test' | 'live';
export type LoginOrg = 'kakao' | 'naver' | 'pass' | 'toss' | 'payco' | 'kica' | 'kb' | 'shinhan';
export type Carrier = 'S' | 'K' | 'L';

export interface StartInput {
  name: string;
  birthDate: string; // YYYYMMDD
  phone: string;
  loginOrg: LoginOrg;
  carrier?: Carrier;
}

// As Hyphen returns it (in0002000432 "건강검진결과 한눈에 보기"); values are strings, as received.
export interface CheckupItem {
  type?: string;
  targetDis?: string;
  inspectItem?: string;
  div?: string;
  result?: string;
  unit?: string;
  normalA?: string;
  normalB?: string;
  suspicionDis?: string;
}

export interface Checkup {
  year?: string;
  result?: string; // NHIS verdict (판정)
  chkAgency?: string;
  opinion?: string;
  chkResult?: CheckupItem[];
}

export interface CompleteResult {
  mode: HyphenMode;
  checkups: Checkup[];
  // The saved lookup (nhisCheckups); null if the server could not save it, or nothing to save.
  savedId: string | null;
  // Approved, but NHIS has no checkup record for this person (nothing saved).
  noRecords?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/nhis/${path}`, init);
  } catch (e) {
    // The browser could not reach our backend at all (wrong address, server down, other Wi-Fi).
    console.error(`[nhis] cannot reach ${API}/nhis/${path}`, e);
    throw new Error(`Cannot reach the iink server at ${API}. Is the PC on and on the same Wi-Fi?`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[nhis] ${path} → HTTP ${res.status}`, body);
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Lookups are saved for the logged-in member, so they need the login.
async function post(body: unknown): Promise<RequestInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  };
}

// One step: the request stays open until the person approves on their phone (up to a few minutes).
export const lookupCheckups = async (input: StartInput) => request<CompleteResult>('lookup', await post(input));
