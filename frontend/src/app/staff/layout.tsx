'use client';

import { RoleGate } from '@/components/RoleGate';
import { WorkShell } from '@/components/admin/WorkShell';
import { useAuth } from '@/store/auth';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const role = useAuth((s) => s.user?.role);
  const nav = [{ href: '/staff', label: 'Quầy pha chế', exact: true }];
  if (role === 'MANAGER') nav.push({ href: '/admin', label: 'Trang quản lý', exact: false });

  return (
    <RoleGate allow={['STAFF', 'MANAGER']}>
      <WorkShell nav={nav}>{children}</WorkShell>
    </RoleGate>
  );
}
