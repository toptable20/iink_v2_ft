import type { Metadata } from 'next';
import { AuthShell } from '../auth-ui';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Sign up | iink' };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Save your quiz results and get your personal dessert plan.">
      <SignupForm />
    </AuthShell>
  );
}
