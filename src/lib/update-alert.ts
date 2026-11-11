'use client';

import Swal from 'sweetalert2';
import { createMySmartQuizResult, type SmartQuizResult } from '@/lib/smart-quiz';
import { GREEN, koreanError } from '@/lib/alerts';

// 설문 / 검진 / 워치 (the result's usedSources) in plain words: "스마트 퀴즈와 워치 데이터를 사용했어요."
const NAMES: Record<string, string> = { 설문: '스마트 퀴즈', 검진: '건강검진', 워치: '워치' };
// Result list title: "스마트 퀴즈 + 건강검진 + 워치"
export function usedDataLabel(usedSources: string[]): string {
  return usedSources.map((w) => NAMES[w] ?? w).join(' + ');
}

export function usedDataText(usedSources: string[]): string {
  const names = usedSources.map((w) => NAMES[w] ?? w);
  if (names.length === 1) return `${names[0]} 데이터를 사용했어요.`;
  const last = names[names.length - 1];
  const head = names.slice(0, -1).join(', ');
  // 와 after a vowel-ending word (퀴즈), 과 after a consonant (건강검진)
  const lastOfHead = head.charCodeAt(head.length - 1);
  const josa = lastOfHead >= 0xac00 && lastOfHead <= 0xd7a3 && (lastOfHead - 0xac00) % 28 !== 0 ? '과' : '와';
  return `${head}${josa} ${last} 데이터를 사용했어요.`;
}

// "결과 업데이트": a blocking loading pop-up while the new result is made, then a success or error pop-up.
// Returns the new result, or null when it failed (the error pop-up has already been shown).
export async function updateResultWithAlert(): Promise<SmartQuizResult | null> {
  void Swal.fire({
    title: '결과를 업데이트하고 있어요',
    text: '잠시만 기다려 주세요.',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const report = await createMySmartQuizResult();
    await Swal.fire({
      icon: 'success',
      title: '업데이트 완료',
      text: usedDataText(report.usedSources),
      confirmButtonText: '확인',
      confirmButtonColor: GREEN,
    });
    return report;
  } catch (e) {
    await Swal.fire({
      icon: 'error',
      title: '업데이트하지 못했습니다',
      text: koreanError((e as Error).message),
      confirmButtonText: '확인',
      confirmButtonColor: GREEN,
    });
    return null;
  }
}
