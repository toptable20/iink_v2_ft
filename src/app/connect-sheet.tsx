'use client';

import { useEffect } from 'react';
import { CheckupLookup } from './checkup/checkup';
import { Devices } from './devices/devices';
import { InConnectSheet } from './update-check';

export type ConnectKind = 'checkup' | 'watch';

// The checkup / watch connection opened over the report, so the user never leaves it.
// The lookup and the watch link are the same components as on /checkup and /devices.
// On close the report checks again what a new result would use (its ✓ / ✕ lines and the update button).
export function ConnectSheet({ kind, onClose }: { kind: ConnectKind; onClose: () => void }) {
  // Esc closes the sheet like the close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-t-[28px] bg-[#f8f7f2] p-4 sm:rounded-[28px] sm:p-6">
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#5f5e58] hover:bg-white">
            닫기
          </button>
        </div>
        <InConnectSheet.Provider value={true}>{kind === 'checkup' ? <CheckupLookup /> : <Devices />}</InConnectSheet.Provider>
      </div>
    </div>
  );
}
