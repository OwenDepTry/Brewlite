import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PromotionRule } from '../domain/promotion';

@Entity('promotions')
export class Promotion implements PromotionRule {
  /** Mã nhập vào, lưu dạng IN HOA */
  @PrimaryColumn({ length: 30 })
  code!: string;

  @Column({ length: 255, default: '' })
  description!: string;

  @Column({ type: 'int' })
  percentOff!: number;

  @Column({ type: 'int', nullable: true })
  maxDiscount!: number | null;

  @Column({ type: 'int', default: 0 })
  minOrderTotal!: number;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'timestamptz' })
  endsAt!: Date;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'int', nullable: true })
  usageLimit!: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount!: number;
}
