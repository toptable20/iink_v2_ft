import { useSyncExternalStore } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const STORAGE_KEY = 'iink_auth';
const CHANGE_EVENT = 'iink-auth-change';

export type MemberType = 'MEMBER' | 'ADMIN';

export interface SessionMember {
  _id: string;
  memberNick: string;
  memberType: MemberType;
}

export interface Session {
  accessToken: string; // 10 minutes
  refreshToken: string; // 7 days; renews the access token
  member: SessionMember;
}

export interface SignupInput {
  memberNick: string;
  memberPassword: string;
  memberPhone: string;
  memberEmail?: string;
}

export interface LoginInput {
  memberNick: string;
  memberPassword: string;
}

// Same limits as the backend's MemberInput / LoginInput.
export const NICK_LENGTH = { min: 3, max: 25 };
export const PASSWORD_LENGTH = { min: 7, max: 20 };
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

type AuthPayload = SessionMember & { accessToken: string; refreshToken: string };
const AUTH_FIELDS = '_id memberNick memberType accessToken refreshToken';

async function gql<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error(`Cannot reach the iink server at ${API}. Is the PC on and on the same Wi-Fi?`);
  }
  const body = await res.json().catch(() => ({}));
  if (body.errors?.length) {
    // Validation errors arrive as a list of messages.
    const message = body.errors[0].message;
    throw new Error(Array.isArray(message) ? message.join('\n') : (message ?? 'Request failed'));
  }
  if (!res.ok || !body.data) throw new Error(`API error ${res.status}`);
  return body.data as T;
}

// ---- Session in the browser (localStorage), shared with every component through useSession() ----

let cache: { raw: string | null; session: Session | null } = { raw: null, session: null };

function readSession(): Session | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.): behave as logged out.
  }
  if (raw !== cache.raw) {
    let session: Session | null = null;
    try {
      session = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      session = null;
    }
    cache = { raw, session };
  }
  return cache.session;
}

function saveSession(payload: AuthPayload) {
  const session: Session = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    member: { _id: payload._id, memberNick: payload.memberNick, memberType: payload.memberType },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Not saved: the member stays logged in only until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange); // login or logout in another tab
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// The logged-in member, or null. Always null during server rendering.
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, readSession, () => null);
}

// ---- API calls ----

export async function signup(input: SignupInput): Promise<SessionMember> {
  const data = await gql<{ signup: AuthPayload }>(
    `mutation Signup($input: MemberInput!) { signup(input: $input) { ${AUTH_FIELDS} } }`,
    { input },
  );
  saveSession(data.signup);
  return readSession()!.member;
}

export async function login(input: LoginInput): Promise<SessionMember> {
  const data = await gql<{ login: AuthPayload }>(
    `mutation Login($input: LoginInput!) { login(input: $input) { ${AUTH_FIELDS} } }`,
    { input },
  );
  saveSession(data.login);
  return readSession()!.member;
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 < Date.now() + 30_000; // renew 30 s early
  } catch {
    return true;
  }
}

// A valid access token for API calls, renewed with the refresh token when needed. null = logged out.
export async function getAccessToken(): Promise<string | null> {
  const session = readSession();
  if (!session) return null;
  if (!isExpired(session.accessToken)) return session.accessToken;
  try {
    const data = await gql<{ refreshToken: AuthPayload }>(
      `mutation Refresh($token: String!) { refreshToken(refreshToken: $token) { ${AUTH_FIELDS} } }`,
      { token: session.refreshToken },
    );
    saveSession(data.refreshToken);
    return data.refreshToken.accessToken;
  } catch {
    clearSession(); // refresh token expired or revoked: log in again
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    const token = await getAccessToken();
    if (token) await gql<{ logout: boolean }>('mutation Logout { logout }', {}, token);
  } catch {
    // The server forgets the refresh token when it can; the browser forgets the session anyway.
  } finally {
    clearSession();
  }
}
