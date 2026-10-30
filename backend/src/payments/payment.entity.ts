import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const PAYMENT_METHODS = ['WALLET', 'CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
/** PROCESSING chỉ tồn tại bên trong transaction khi đang gọi cổng thanh toán */
export type PaymentStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'int' })
  orderId!: number;

  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * Khóa idempotent do client gửi qua header Idempotency-Key.
   * UNIQUE => cùng một yêu cầu thanh toán gửi lặp lại chỉ được ghi nhận (và trừ tiền) 1 lần.
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  idempotencyKey!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 10 })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 12 })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason!: string | null;

  /** Mã giao dịch do cổng thanh toán (giả lập) trả về */
  @Column({ type: 'varchar', length: 64, nullable: true })
  transactionRef!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
