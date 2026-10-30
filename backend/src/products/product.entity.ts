import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  VersionColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ length: 50, default: 'Cà phê' })
  category!: string;

  /** Giá gốc (size S), đơn vị VND */
  @Column({ type: 'int' })
  price!: number;

  @Column({ length: 255, default: '' })
  imageUrl!: string;

  /** Số ly còn có thể bán (tồn kho) */
  @Column({ type: 'int', default: 0 })
  stock!: number;

  /** Dùng cho optimistic locking khi trừ tồn kho */
  @VersionColumn()
  version!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
