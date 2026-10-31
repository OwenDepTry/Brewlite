import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';
import { trim } from '../../auth/dto/auth.dto';
import { ORDER_STATUSES, type OrderStatus } from '../../domain/order-status';
import { USER_ROLES, type UserRole } from '../../users/user.entity';

// ---------------- Sản phẩm ----------------

export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên đồ uống' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập danh mục' })
  @MaxLength(50)
  category!: string;

  @IsInt({ message: 'Giá phải là số nguyên (VND)' })
  @Min(1000, { message: 'Giá tối thiểu 1.000đ' })
  @Max(10_000_000)
  price!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Tồn kho không được âm' })
  @Max(100_000)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Sửa thông tin món – tồn kho đổi qua endpoint riêng để không ghi đè số đang bán */
export class UpdateProductDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tên đồ uống không được trống' })
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsInt({ message: 'Giá phải là số nguyên (VND)' })
  @Min(1000, { message: 'Giá tối thiểu 1.000đ' })
  @Max(10_000_000)
  price?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustStockDto {
  /** Số ly cộng thêm (dương) hoặc trừ bớt (âm) */
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @NotEquals(0, { message: 'Số lượng điều chỉnh phải khác 0' })
  @Min(-100_000)
  @Max(100_000)
  delta!: number;
}

// ---------------- Topping ----------------

export class CreateToppingDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên topping' })
  @MaxLength(100)
  name!: string;

  @IsInt({ message: 'Giá phải là số nguyên (VND)' })
  @Min(0)
  @Max(1_000_000)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateToppingDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ---------------- Khuyến mãi ----------------

export class CreatePromotionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,30}$/, { message: 'Mã chỉ gồm chữ in hoa, số, - và _, dài 2–30 ký tự' })
  code!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsInt({ message: 'Phần trăm giảm phải là số nguyên' })
  @Min(1, { message: 'Giảm tối thiểu 1%' })
  @Max(100, { message: 'Giảm tối đa 100%' })
  percentOff!: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maxDiscount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderTotal?: number;

  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startsAt!: string;

  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePromotionDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  /** null = bỏ giới hạn mức giảm */
  @IsOptional()
  @IsInt()
  @Min(1000)
  maxDiscount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderTotal?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  /** null = không giới hạn lượt */
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ---------------- Tài khoản ----------------

export class CreateUserDto {
  @Transform(trim)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password!: string;

  @IsIn(USER_ROLES as unknown as string[], { message: 'Vai trò không hợp lệ' })
  role!: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsIn(USER_ROLES as unknown as string[], { message: 'Vai trò không hợp lệ' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Đặt lại mật khẩu cho nhân viên/khách quên mật khẩu */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password?: string;
}

// ---------------- Truy vấn danh sách ----------------

export class ListUsersQuery {
  @IsOptional()
  @IsIn(USER_ROLES as unknown as string[])
  role?: UserRole;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class ListOrdersQuery {
  @IsOptional()
  @IsIn(ORDER_STATUSES as unknown as string[])
  status?: OrderStatus;

  /** Mã đơn (#12 hoặc 12) hoặc email khách */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class StatsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 14, 30], { message: 'Chỉ hỗ trợ 7, 14 hoặc 30 ngày' })
  days?: number;
}
