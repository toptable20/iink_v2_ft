'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/lib/auth';
import { lookupCheckups, type Carrier, type CheckupItem, type CompleteResult, type LoginOrg } from '@/lib/nhis';
import { LoggedInAs } from '../logged-in-as';
import { UpdateResultPrompt } from '../update-result-prompt';
import { Card, primaryButton } from '../ui';

const LOGIN_ORGS: { value: LoginOrg; label: string }[] = [
  { value: 'kakao', label: 'KakaoTalk' },
  { value: 'naver', label: 'Naver' },
  { value: 'pass', label: 'PASS' },
  { value: 'toss', label: 'Toss' },
  { value: 'payco', label: 'PAYCO' },
  { value: 'kica', label: 'Samsung Pass' },
  { value: 'kb', label: 'KB Star Banking' },
  { value: 'shinhan', label: 'Shinhan' },
];

const CARRIERS: { value: Carrier; label: string }[] = [
  { value: 'S', label: 'SKT' },
  { value: 'K', label: 'KT' },
  { value: 'L', label: 'LG U+' },
];

// Every item field exactly as Hyphen sends it (in0002000432), with the spec's own names.
const ITEM_COLUMNS: { key: keyof CheckupItem; label: string }[] = [
  { key: 'type', label: '구분' },
  { key: 'targetDis', label: '목표질환' },
  { key: 'inspectItem', label: '검사항목' },
  { key: 'div', label: '분류' },
  { key: 'result', label: '결과' },
  { key: 'unit', label: '단위' },
  { key: 'normalA', label: '정상(A)' },
  { key: 'normalB', label: '정상(B)' },
  { key: 'suspicionDis', label: '질환의심' },
];

const input = 'mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none';

export function CheckupLookup() {
  const session = useSession();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [loginOrg, setLoginOrg] = useState<LoginOrg>('kakao');
  const [carrier, setCarrier] = useState<Carrier>('S');
  const [consent, setConsent] = useState(false);

  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  async function lookup() {
    setWaiting(true);
    setError(null);
    const started = performance.now();
    const seconds = () => `${((performance.now() - started) / 1000).toFixed(1)}s`;
    // Diagnostics in the browser console (F12). Masked: no full name, phone or birth date.
    console.info('[checkup] sending', {
      api: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
      loginOrg,
      carrier: loginOrg === 'pass' ? carrier : undefined,
      name: { length: [...name.trim()].length, hangulOnly: /^[가-힣]+$/.test(name.trim()), hasSpace: /\s/.test(name.trim()) },
      birthYear: birthDate.slice(0, 4),
      phone: { digits: phone.replace(/\D/g, '').length, last4: phone.replace(/\D/g, '').slice(-4) },
    });
    try {
      const res = await lookupCheckups({
        name,
        birthDate: birthDate.replace(/-/g, ''),
        phone,
        loginOrg,
        carrier: loginOrg === 'pass' ? carrier : undefined,
      });
      console.info(`[checkup] ok after ${seconds()}`, {
        mode: res.mode,
        checkups: res.checkups.map((c) => ({ year: c.year, items: c.chkResult?.length ?? 0, verdict: !!c.result })),
      });
      setResult(res);
    } catch (e) {
      console.error(`[checkup] failed after ${seconds()}:`, (e as Error).message);
      setError((e as Error).message);
    } finally {
      setWaiting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  const orgLabel = LOGIN_ORGS.find((o) => o.value === loginOrg)?.label;

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Health Checkup</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Bring in your national health checkup results (NHIS). You approve the request on your phone; we never see your NHIS
        login.
      </p>

      {!session && (
        <p className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
          Please{' '}
          <Link href="/login" className="font-medium text-teal-700 underline">
            log in
          </Link>{' '}
          first. Your checkup results are saved to your account.
        </p>
      )}

      {session && !waiting && !result && (
        <div className="mt-6 space-y-4">
          <LoggedInAs />
          <label className="block text-sm">
            Name (as registered with NHIS)
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="block text-sm">
            Date of birth
            <input className={input} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>
          <label className="block text-sm">
            Mobile number
            <input
              className={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              inputMode="numeric"
              autoComplete="tel"
            />
          </label>
          <label className="block text-sm">
            Approve with
            <select className={input} value={loginOrg} onChange={(e) => setLoginOrg(e.target.value as LoginOrg)}>
              {LOGIN_ORGS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {loginOrg === 'pass' && (
            <label className="block text-sm">
              Mobile carrier
              <select className={input} value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
                {CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-start gap-2 text-sm text-zinc-700">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree that my name, date of birth and mobile number are sent to Hyphen to fetch my NHIS checkup results.
              Checkup data is health information. The results are saved to my account and used only for personalized
              recommendations and to improve iink, never for medical diagnosis. My name, date of birth and mobile number
              are not saved.
            </span>
          </label>
          <button
            type="button"
            onClick={lookup}
            disabled={!consent || !name || !birthDate || !phone}
            className={`${primaryButton} w-full`}
          >
            Send approval request
          </button>
        </div>
      )}

      {waiting && (
        <div className="mt-6 rounded-2xl bg-zinc-50 p-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-700 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-700">
            Open <strong>{orgLabel}</strong> on your phone now and approve the request.
            <br />
            Your checkup data appears here right after you approve.
          </p>
          <p className="mt-2 text-xs text-zinc-500">Keep this page open. It can take up to a few minutes.</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          {result.savedId ? (
            <>
              <p className="text-xs text-zinc-500">Saved to your account.</p>
              <UpdateResultPrompt what="checkup results" />
            </>
          ) : (
            <p className="text-xs text-red-600">These results could not be saved. Please tell the iink team.</p>
          )}
          {result.checkups.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">NHIS has no checkup results for this person.</p>
          ) : (
            result.checkups.map((checkup, i) => (
              <section key={`${checkup.year}-${i}`} className="mt-6">
                {/* Checkup-level fields as sent: 년도, 판정, 검진기관, 소견 */}
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-zinc-500">년도</dt>
                  <dd className="font-semibold">{checkup.year}</dd>
                  <dt className="text-zinc-500">판정</dt>
                  <dd>{checkup.result}</dd>
                  <dt className="text-zinc-500">검진기관</dt>
                  <dd>{checkup.chkAgency}</dd>
                  <dt className="text-zinc-500">소견</dt>
                  <dd className="whitespace-pre-line">{checkup.opinion}</dd>
                </dl>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr>
                        {ITEM_COLUMNS.map((c) => (
                          <th key={c.key} className="whitespace-nowrap px-2 py-1.5 font-medium">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {(checkup.chkResult ?? []).map((item, j) => (
                        <tr key={j}>
                          {ITEM_COLUMNS.map((c) => (
                            <td key={c.key} className={`px-2 py-1.5 ${c.key === 'result' ? 'font-semibold' : ''}`}>
                              {item[c.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
          <button type="button" onClick={reset} className="mt-6 text-sm font-medium text-teal-700 underline">
            Look up again
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
