import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Spinner } from '@/components/StateViews';

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
