'use client';

import { RoleGate } from '@/components/RoleGate';
import { WorkShell } from '@/components/admin/WorkShell';

const NAV = [
  { href: '/admin', label: 'Tổng quan', exact: true },
  { href: '/admin/orders', label: 'Đơn hàng' },
  { href: '/admin/menu', label: 'Menu & tồn kho' },
  { href: '/admin/promotions', label: 'Khuyến mãi' },
  { href: '/admin/accounts', label: 'Tài khoản' },
  { href: '/staff', label: 'Quầy pha chế' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={['MANAGER']}>
      <WorkShell nav={NAV}>{children}</WorkShell>
    </RoleGate>
  );
}
