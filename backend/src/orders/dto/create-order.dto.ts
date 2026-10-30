import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ORDER_STATUSES, type OrderStatus } from '../../domain/order-status';
import { SIZES, type Size } from '../../domain/pricing';

export class CreateOrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1)
  productId!: number;

  @IsIn(SIZES as unknown as string[], { message: 'size phải là S, M hoặc L' })
  size!: Size;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Tối đa 5 topping mỗi ly' })
  @ArrayUnique()
  @IsInt({ each: true })
  toppingIds?: number[];

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(20, { message: 'Số lượng tối đa mỗi dòng là 20' })
  qty!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng phải có ít nhất 1 sản phẩm' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  /** Mã giảm giá (không phân biệt hoa thường) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || undefined : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,30}$/, { message: 'Mã giảm giá không hợp lệ' })
  promoCode?: string;
}

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES as unknown as string[], { message: 'Trạng thái không hợp lệ' })
  status!: OrderStatus;
}
