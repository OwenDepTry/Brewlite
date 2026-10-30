import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Spinner } from '@/components/StateViews';

export default function RegisterPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
