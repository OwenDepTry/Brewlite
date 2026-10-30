import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { OrderStatus } from '../domain/order-status';
import { OrderItem } from './order-item.entity';

@Entity('orders')
/** Cùng một user gửi lại cùng Idempotency-Key thì chỉ có 1 đơn (NULL không bị ràng buộc) */
@Index('UQ_orders_user_idempotency', ['userId', 'idempotencyKey'], { unique: true })
export class Order {
  /** Mã đơn hiển thị cho khách: #<id> */
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: OrderStatus;

  /** Tổng tiền hàng trước giảm giá */
  @Column({ type: 'int' })
  subtotal!: number;

  @Column({ type: 'int', default: 0 })
  discount!: number;

  /** Số tiền phải thanh toán = subtotal - discount */
  @Column({ type: 'int' })
  total!: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  promoCode!: string | null;

  /** Điểm tích lũy đã cộng cho khách khi đơn PAID */
  @Column({ type: 'int', default: 0 })
  pointsEarned!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idempotencyKey!: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
