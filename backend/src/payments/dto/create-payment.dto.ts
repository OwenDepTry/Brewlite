import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PAYMENT_METHODS, type PaymentMethod } from '../payment.entity';

export class CreatePaymentDto {
  @IsInt({ message: 'orderId phải là số nguyên' })
  @Min(1)
  orderId!: number;

  @IsIn(PAYMENT_METHODS as unknown as string[], { message: 'Phương thức phải là WALLET (ví) hoặc CARD (thẻ)' })
  method!: PaymentMethod;

  /** Chỉ dùng cho demo/test: buộc cổng thanh toán giả lập trả lỗi */
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
