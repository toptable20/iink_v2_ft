'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createMyHealthReport } from '@/lib/health-report';

// Shown after new data is connected (checkup lookup, first watch sync): the saved result does not
// change by itself, so offer to make a new one with the latest data.
export function UpdateResultPrompt({ what }: { what: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function update() {
    setState('busy');
    try {
      await createMyHealthReport();
      setState('done');
    } catch (e) {
      setMessage((e as Error).message);
      setState('error');
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      {state === 'done' ? (
        <p>
          ✓ Your result was updated with your {what}.{' '}
          <Link href="/results" className="font-semibold underline">
            See my results →
          </Link>
        </p>
      ) : (
        <>
          <p>New {what} connected. Update your result so it uses this data?</p>
          <button
            type="button"
            onClick={update}
            disabled={state === 'busy'}
            className="mt-2 rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {state === 'busy' ? 'Updating…' : 'Update my result'}
          </button>
          {state === 'error' && (
            <p className="mt-2 text-red-700">
              {message}{' '}
              <Link href="/quiz" className="font-semibold underline">
                Take the quiz →
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
