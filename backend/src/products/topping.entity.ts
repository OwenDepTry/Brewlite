import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('toppings')
export class Topping {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  /** Giá cộng thêm mỗi ly, VND */
  @Column({ type: 'int' })
  price!: number;

  @Column({ default: true })
  isActive!: boolean;
}
