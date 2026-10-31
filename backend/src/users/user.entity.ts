import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * - CUSTOMER: khách tự đăng ký, đặt và thanh toán đơn
 * - STAFF:    nhân viên quầy, do quản lý tạo; cập nhật trạng thái pha chế
 * - MANAGER:  quản lý cửa hàng; toàn quyền menu, khuyến mãi, tài khoản, báo cáo
 */
export const USER_ROLES = ['CUSTOMER', 'STAFF', 'MANAGER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Vai trò làm việc tại quầy (được xử lý đơn) */
export function isStaffRole(role: UserRole): boolean {
  return role === 'STAFF' || role === 'MANAGER';
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ length: 100, default: '' })
  fullName!: string;

  /** bcrypt hash – không bao giờ trả về client; mặc định không SELECT */
  @Column({ length: 100, select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
  role!: UserRole;

  /** false = tài khoản bị khóa: không đăng nhập được, token cũ cũng bị từ chối */
  @Column({ default: true })
  isActive!: boolean;

  /** Điểm tích lũy, cộng khi đơn chuyển sang PAID */
  @Column({ type: 'int', default: 0 })
  loyaltyPoints!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

export function toUserView(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    loyaltyPoints: u.loyaltyPoints,
    createdAt: u.createdAt,
  };
}

export type UserView = ReturnType<typeof toUserView>;
