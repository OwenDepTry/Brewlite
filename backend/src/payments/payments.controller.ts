import { Body, Controller, Headers, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import type { AuthUser } from '../auth/jwt.strategy';
import { IDEMPOTENCY_HEADER, parseIdempotencyKey } from '../common/idempotency';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments – thanh toán đơn bằng Ví/Thẻ qua cổng giả lập.
   * Bắt buộc header Idempotency-Key; gửi lại cùng khóa => nhận lại đúng kết quả cũ, không trừ tiền lần 2.
   */
  @Post()
  @HttpCode(200)
  async pay(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthUser,
    @Headers(IDEMPOTENCY_HEADER) rawKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = parseIdempotencyKey(rawKey, true)!;
    const result = await this.paymentsService.pay(dto, user, key);
    if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return result;
  }
}
