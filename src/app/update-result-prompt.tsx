'use client';

import Link from 'next/link';
import { useContext, useState } from 'react';
import { updateResultWithAlert } from '@/lib/update-alert';
import { InConnectSheet, UpdateCheckRows, useUpdateCheck } from './update-check';

// Shown after new data is connected (checkup lookup, watch sync) on /checkup and /devices: the saved result does
// not change by itself. It first checks what a new result would use (✓ / ✕ and why) and offers the update only
// when that adds something. Inside the sheet over the report it hides: the report has its own check and button.
export function UpdateResultPrompt({ what }: { what: string }) {
  const inSheet = useContext(InConnectSheet);
  const kind = what.includes('검진') ? 'checkup' : 'watch';
  const { check, loading, reload } = useUpdateCheck(null, !inSheet);
  const [done, setDone] = useState(false);
  const adds = Boolean(check && check.newData[kind]);

  if (inSheet || (!check && !loading)) return null;

  async function update() {
    if (await updateResultWithAlert()) setDone(true);
    reload();
  }

  return (
    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      {done ? (
        <p>
          ✓ {what}를 반영해 결과를 업데이트했습니다.{' '}
          <Link href="/results" className="font-semibold underline">
            내 결과 보기 →
          </Link>
        </p>
      ) : !check ? (
        <p>결과에 반영할 수 있는지 확인하는 중…</p>
      ) : (
        <>
          <UpdateCheckRows check={check} only={kind} />
          {adds && (
            <button
              type="button"
              onClick={update}
              className="mt-3 rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800"
            >
              내 결과 업데이트
            </button>
          )}
        </>
      )}
    </div>
  );
}
