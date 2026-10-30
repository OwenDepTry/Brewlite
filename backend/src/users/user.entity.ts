import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'CUSTOMER' | 'STAFF';

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
    loyaltyPoints: u.loyaltyPoints,
  };
}
