import type { Metadata } from 'next';
import { AuthShell } from '../auth-ui';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in | iink' };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to keep your quiz results and dessert plan in one place.">
      <LoginForm />
    </AuthShell>
  );
}
