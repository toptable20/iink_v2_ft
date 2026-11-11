import type { Metadata } from 'next';
import { AuthShell } from '../auth-ui';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: '로그인 | iink' };

export default function LoginPage() {
  return (
    <AuthShell title="다시 만나 반가워요" subtitle="로그인하고 퀴즈 결과와 나만의 맞춤 정보를 확인하세요.">
      <LoginForm />
    </AuthShell>
  );
}
