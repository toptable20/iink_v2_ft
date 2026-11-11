import type { Metadata } from 'next';
import { AuthShell } from '../auth-ui';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: '회원가입 | iink' };

export default function SignupPage() {
  return (
    <AuthShell title="회원가입" subtitle="퀴즈 결과를 저장하고 나에게 맞는 맞춤 정보를 받아보세요.">
      <SignupForm />
    </AuthShell>
  );
}
