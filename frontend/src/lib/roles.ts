import type { UserRole } from './types';

export const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên quầy',
  MANAGER: 'Quản lý',
};

/** Trang làm việc mặc định sau khi đăng nhập */
export function homeFor(role: UserRole | undefined): string {
  if (role === 'MANAGER') return '/admin';
  if (role === 'STAFF') return '/staff';
  return '/';
}

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'STAFF' || role === 'MANAGER';
}
