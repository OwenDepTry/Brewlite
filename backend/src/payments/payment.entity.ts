import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const PAYMENT_METHODS = ['WALLET', 'CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = 'SUCCESS' | 'FAILED';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'int' })
  orderId!: number;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 10 })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 10 })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason!: string | null;

  /** Mã giao dịch do cổng thanh toán (giả lập) trả về */
  @Column({ type: 'varchar', length: 64, nullable: true })
  transactionRef!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
