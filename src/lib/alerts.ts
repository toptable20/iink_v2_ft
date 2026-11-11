'use client';

import Swal from 'sweetalert2';

export const GREEN = '#55aa7a';

// Backend messages (English) -> what the user reads. Unknown English text gets a general message;
// Korean text from the app itself is shown as it is.
const EXACT: Record<string, string> = {
  'Please finish the quiz first.': '먼저 퀴즈를 끝까지 완료해 주세요.',
  'The quiz questions were updated. Please take the quiz again.': '퀴즈 질문이 업데이트되었습니다. 퀴즈를 다시 진행해 주세요.',
  'The quiz questions were updated. Please start the quiz again.': '퀴즈 질문이 업데이트되었습니다. 퀴즈를 다시 시작해 주세요.',
  'This quiz changed in another window. Please reload the page.': '다른 창에서 퀴즈가 진행되었습니다. 페이지를 새로고침해 주세요.',
  'No open quiz with that id. Start the quiz again.': '진행 중인 퀴즈를 찾을 수 없습니다. 퀴즈를 다시 시작해 주세요.',
  'This quiz has no open question.': '이미 완료된 퀴즈입니다. 페이지를 새로고침해 주세요.',
  'There is no answer to go back to.': '이전 질문이 없습니다.',
  'Smart quiz result not found': '결과를 찾을 수 없습니다.',
  'Only your latest smart quiz result can be ordered. Please open your latest result.': '최신 결과로만 주문할 수 있습니다. 최신 결과를 열어 주세요.',
  'You are not authenticated, please login first!': '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  'Bearer token is not provided!': '로그인이 필요합니다. 다시 로그인해 주세요.',
  'resultId is not valid': '결과를 찾을 수 없습니다.',
  'smartQuizResultId is not valid': '결과를 찾을 수 없습니다.',
  'sessionId is not valid': '진행 중인 퀴즈를 찾을 수 없습니다. 퀴즈를 다시 시작해 주세요.',
  'examDate must be YYYY-MM-DD': '검진일을 YYYY-MM-DD 형식으로 입력해 주세요.',
  'No checkup values given.': '검진 수치를 하나 이상 입력해 주세요.',
};

export function koreanError(message: string): string {
  if (EXACT[message]) return EXACT[message];
  const range = message.match(/must be between (\S+) and (\S+)$/);
  if (range) return `${range[1]}~${range[2]} 사이의 값을 입력해 주세요.`;
  if (/must be a whole number$/.test(message)) return '정수로 입력해 주세요.';
  if (/^Expected an answer to /.test(message)) return '다른 창에서 퀴즈가 진행되었습니다. 페이지를 새로고침해 주세요.';
  if (/^This result offers no product/.test(message)) return '이 결과는 제품 제공이 보류되어 주문할 수 없습니다.';
  if (/^unknown checkup field /.test(message) || / is given twice$/.test(message)) return '검진 항목을 다시 확인해 주세요.';
  if (/must be a number$/.test(message)) return '숫자로 입력해 주세요.';
  if (/[가-힣]/.test(message)) return message;
  console.error('[iink]', message);
  return '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export async function showError(title: string, e: unknown): Promise<void> {
  await Swal.fire({
    icon: 'error',
    title,
    text: koreanError(e instanceof Error ? e.message : String(e)),
    confirmButtonText: '확인',
    confirmButtonColor: GREEN,
  });
}

// A yes / no question before an action that loses something. Returns true for yes.
export async function confirmAction(title: string, text: string, yes: string): Promise<boolean> {
  const r = await Swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: yes,
    cancelButtonText: '취소',
    confirmButtonColor: GREEN,
    reverseButtons: true,
  });
  return r.isConfirmed;
}
