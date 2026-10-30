import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Size } from '../domain/pricing';
import { Order } from './order.entity';

export interface OrderItemTopping {
  id: number;
  name: string;
  price: number;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'int' })
  orderId!: number;

  @Column({ type: 'int' })
  productId!: number;

  /** Lưu lại tên/giá tại thời điểm đặt để lịch sử đơn không đổi khi menu đổi */
  @Column({ length: 100 })
  productName!: string;

  @Column({ type: 'varchar', length: 1 })
  size!: Size;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  toppings!: OrderItemTopping[];

  @Column({ type: 'int' })
  unitPrice!: number;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ type: 'int' })
  lineTotal!: number;
}
