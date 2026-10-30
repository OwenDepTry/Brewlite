import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { isUniqueViolation } from '../common/db-errors';
import { loyaltyPointsFor } from '../domain/promotion';
import { ensureTransition } from '../orders/order-transition';
import { Order } from '../orders/order.entity';
import { toOrderView } from '../orders/order.view';
import { User } from '../users/user.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentGateway } from './mock-payment.gateway';
import { Payment } from './payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly gateway: MockPaymentGateway,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Thanh toán idempotent:
   * 1. Đã có Payment với Idempotency-Key này -> trả lại đúng kết quả cũ (không trừ tiền lần 2).
   * 2. Khóa dòng đơn (SELECT … FOR UPDATE) để các request đồng thời của cùng đơn xếp hàng.
   * 3. Ghi Payment (UNIQUE idempotencyKey) TRƯỚC khi gọi cổng thanh toán – request trùng khóa
   *    bị chặn ở ràng buộc UNIQUE nên không bao giờ gọi cổng lần 2.
   * 4. Máy trạng thái: PENDING -> PAID | PAYMENT_FAILED; PAYMENT_FAILED -> PENDING (thử lại) -> …
   *    Đơn đã PAID/hủy thì assertTransition chặn => không thể trả tiền 2 lần cho 1 đơn dù khác khóa.
   * 5. Thành công: cộng điểm tích lũy cho khách trong cùng transaction.
   */
  async pay(dto: CreatePaymentDto, user: AuthUser, idempotencyKey: string) {
    const replay = await this.findReplay(idempotencyKey, dto.orderId, user.id);
    if (replay) return replay;

    try {
      const outcome = await this.dataSource.transaction(async (m) => {
        const order = await m.findOne(Order, { where: { id: dto.orderId }, lock: { mode: 'pessimistic_write' } });
        if (!order) throw new NotFoundException(`Không tìm thấy đơn #${dto.orderId}`);
        if (order.userId !== user.id) throw new ForbiddenException('Bạn không thể thanh toán đơn của người khác');

        // Request cùng khóa vừa xong trong lúc ta chờ khóa dòng đơn
        const already = await m.findOne(Payment, { where: { idempotencyKey } });
        if (already) return { paymentId: already.id, replayed: true };

        if (order.status === 'PAYMENT_FAILED') {
          order.status = ensureTransition(order.status, 'PENDING'); // thử lại
        }
        ensureTransition(order.status, 'PAID'); // chặn sớm trước khi trừ tiền

        const payment = await m.save(
          m.create(Payment, {
            orderId: order.id,
            userId: user.id,
            idempotencyKey,
            amount: order.total,
            method: dto.method,
            status: 'PROCESSING',
            failureReason: null,
            transactionRef: null,
          }),
        );

        const result = await this.gateway.charge({
          amount: order.total,
          method: dto.method,
          idempotencyKey,
          simulateFailure: dto.simulateFailure,
        });

        payment.status = result.success ? 'SUCCESS' : 'FAILED';
        payment.failureReason = result.failureReason;
        payment.transactionRef = result.transactionRef;
        await m.save(payment);

        if (result.success) {
          order.status = ensureTransition(order.status, 'PAID');
          order.pointsEarned = loyaltyPointsFor(order.total);
          if (order.pointsEarned > 0) {
            await m.increment(User, { id: user.id }, 'loyaltyPoints', order.pointsEarned);
          }
        } else {
          order.status = ensureTransition(order.status, 'PAYMENT_FAILED');
        }
        await m.save(order);

        return { paymentId: payment.id, replayed: false };
      });

      return this.buildResult(outcome.paymentId, outcome.replayed);
    } catch (err) {
      // Hai request cùng khóa chạy song song cho hai đơn khác nhau: request thua vi phạm UNIQUE
      if (isUniqueViolation(err)) {
        const again = await this.findReplay(idempotencyKey, dto.orderId, user.id);
        if (again) return again;
      }
      throw err;
    }
  }

  private async findReplay(idempotencyKey: string, orderId: number, userId: string) {
    const payment = await this.payments.findOne({ where: { idempotencyKey } });
    if (!payment) return null;
    if (payment.userId !== userId) {
      throw new ForbiddenException('Idempotency-Key không hợp lệ');
    }
    if (payment.orderId !== orderId) {
      throw new UnprocessableEntityException('Idempotency-Key này đã được dùng cho một đơn khác');
    }
    return this.buildResult(payment.id, true);
  }

  private async buildResult(paymentId: string, replayed: boolean) {
    const payment = await this.payments.findOneOrFail({ where: { id: paymentId } });
    const order = await this.orders.findOneOrFail({ where: { id: payment.orderId }, relations: { items: true } });
    return { payment: toPaymentView(payment), order: toOrderView(order), replayed };
  }
}

export function toPaymentView(p: Payment) {
  return {
    id: p.id,
    orderId: p.orderId,
    amount: p.amount,
    method: p.method,
    status: p.status,
    failureReason: p.failureReason,
    transactionRef: p.transactionRef,
    createdAt: p.createdAt,
  };
}
