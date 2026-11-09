'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/auth';
import { createLinkCode, fetchLinkStatus, formatSamsungMetric, SAMSUNG_METRICS, type LinkCode, type LinkStatus, type WearableDay } from '@/lib/wearables';
import { LoggedInAs } from '../logged-in-as';
import { UpdateResultPrompt } from '../update-result-prompt';
import { Card, primaryButton } from '../ui';

const STORAGE_KEY = 'iink.linkId';
const POLL_MS = 5000;

function readStoredLinkId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLinkId(linkId: string | null) {
  try {
    if (linkId) localStorage.setItem(STORAGE_KEY, linkId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode etc.: the page still works, it just forgets the link on reload.
  }
}

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const formatSleep = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US');

// Where a day's numbers were read from on the phone.
const SOURCE_NAME: Record<WearableDay['source'], string> = {
  apple: 'Apple Health',
  health_connect: 'via Health Connect',
  samsung_sdk: 'Samsung Health (direct)',
};

function Value({ value }: { value: string | null }) {
  return value == null ? <span className="text-zinc-400">No data</span> : <span className="font-medium">{value}</span>;
}

export function Devices() {
  const session = useSession();
  const [linkId, setLinkId] = useState<string | null>(null);
  const [code, setCode] = useState<LinkCode | null>(null);
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // localStorage is read after mount on purpose: reading it during render (or in a lazy
  // useState initializer) would make the server and client render different markup and
  // cause a hydration mismatch. Runs once, so no cascading renders.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLinkId(readStoredLinkId()), []);

  const refresh = useCallback(async () => {
    if (!linkId) return;
    try {
      setStatus(await fetchLinkStatus(linkId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [linkId]);

  useEffect(() => {
    if (!linkId) return;
    // First poll fires immediately so the page is not blank for POLL_MS; the rest are on
    // the interval. refresh() is async, so its setState lands in a later tick, not during
    // this effect — the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [linkId, refresh]);

  async function startLink() {
    setBusy(true);
    try {
      const next = await createLinkCode();
      setCode(next);
      setStatus(null);
      setLinkId(next.linkId);
      storeLinkId(next.linkId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setLinkId(null);
    setCode(null);
    setStatus(null);
    storeLinkId(null);
  }

  const linked = status?.linked ?? false;

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Connect Device</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Connect sleep, steps and exercise data from your Apple Watch or Galaxy Watch through the iink app. Your data is used only
        for personalized recommendations, never for medical diagnosis.
      </p>
      <a href="/app/iink.apk?v=1.0.16" download="iink-1.0.16.apk" className="mt-4 inline-block text-sm font-medium text-teal-700 underline">
        Download the iink app (Android)
      </a>

      {!linkId && !session && (
        <p className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
          Please{' '}
          <Link href="/login" className="font-medium text-teal-700 underline">
            log in
          </Link>{' '}
          first. Your watch data is saved to your account.
        </p>
      )}

      {!linkId && session && (
        <div className="mt-6 space-y-4">
          <LoggedInAs />
          <button type="button" onClick={startLink} disabled={busy} className={`${primaryButton} w-full`}>
            Get connection code
          </button>
        </div>
      )}

      {linkId && !linked && (
        <div className="mt-6 rounded-2xl bg-zinc-50 p-6 text-center">
          {status?.unlinkedAt ? (
            <p className="text-sm text-zinc-600">
              Disconnected from the phone ({formatTime(status.unlinkedAt)}).
              <br />
              Get a new code to connect again.
            </p>
          ) : code ? (
            <>
              <p className="text-sm text-zinc-600">Enter this code in the iink app</p>
              <p className="my-3 font-mono text-5xl font-bold tracking-[.3em] text-teal-800">{code.code}</p>
              <p className="text-xs text-zinc-500">
                Valid until {new Date(code.expiresAt).toLocaleTimeString('en-US')} · Waiting for the app…
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">Waiting for the app…</p>
          )}
          <button type="button" onClick={startLink} disabled={busy} className="mt-4 text-sm font-medium text-teal-700 underline">
            Get a new code
          </button>
        </div>
      )}

      {linked && status && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm">
            <span className="font-medium text-teal-900">
              ✓ Connected · {status.platform === 'apple' ? 'Apple Health' : 'Android'}
            </span>
            <span className="text-teal-800">
              Last sync: {status.lastSyncAt ? formatTime(status.lastSyncAt) : 'Not yet'}
            </span>
          </div>

          {status.samsungProfile && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl border border-zinc-100 px-4 py-3 text-sm sm:grid-cols-4">
              <div><dt className="text-zinc-500">Date of birth</dt><dd><Value value={status.samsungProfile.birthDate} /></dd></div>
              <div><dt className="text-zinc-500">Gender</dt><dd><Value value={status.samsungProfile.gender} /></dd></div>
              <div><dt className="text-zinc-500">Height</dt><dd><Value value={status.samsungProfile.heightCm == null ? null : `${status.samsungProfile.heightCm.toFixed(1)} cm`} /></dd></div>
              <div><dt className="text-zinc-500">Weight</dt><dd><Value value={status.samsungProfile.weightKg == null ? null : `${status.samsungProfile.weightKg.toFixed(1)} kg`} /></dd></div>
            </dl>
          )}

          {status.days.length > 0 && <UpdateResultPrompt what="watch data" />}

          {status.days.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">The app hasn&apos;t sent any data yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {status.days.map((day) => (
                <li key={`${day.date}-${day.source}`} className="py-3">
                  <p className="font-semibold">
                    {formatDay(day.date)}
                    <span className="ml-2 text-xs font-normal text-zinc-500">{SOURCE_NAME[day.source]}</span>
                  </p>
                  <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                    <div><dt className="text-zinc-500">Steps</dt><dd><Value value={day.steps == null ? null : day.steps.toLocaleString('en-US')} /></dd></div>
                    <div><dt className="text-zinc-500">Sleep</dt><dd><Value value={day.sleepMinutes == null ? null : formatSleep(day.sleepMinutes)} /></dd></div>
                    <div><dt className="text-zinc-500">Exercise</dt><dd><Value value={day.activeMinutes == null ? null : `${day.activeMinutes} min`} /></dd></div>
                    {/* Samsung Health has no resting heart rate; its lowest/highest heart rate is shown below instead. */}
                    {day.source !== 'samsung_sdk' && (
                      <div><dt className="text-zinc-500">Resting heart rate</dt><dd><Value value={day.restingHr == null ? null : `${day.restingHr} bpm`} /></dd></div>
                    )}
                    {day.source === 'samsung_sdk' &&
                      SAMSUNG_METRICS.map((m) => {
                        const v = day[m.key];
                        return (
                          <div key={m.key}>
                            <dt className="text-zinc-500">{m.label}</dt>
                            <dd><Value value={v == null ? null : formatSamsungMetric(m, v)} /></dd>
                          </div>
                        );
                      })}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {linkId && (
        <button type="button" onClick={reset} className="mt-6 text-xs text-zinc-500 underline">
          Forget this connection in this browser
        </button>
      )}
    </Card>
  );
}
