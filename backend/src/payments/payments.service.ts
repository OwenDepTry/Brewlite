import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { toOrderView } from '../orders/order.view';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentGateway } from './mock-payment.gateway';
import { Payment } from './payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly gateway: MockPaymentGateway,
  ) {}

  /** Thanh toán đơn: thành công -> PAID, lỗi -> PAYMENT_FAILED (khách có thể thử lại). */
  async pay(dto: CreatePaymentDto, userId: string) {
    const order = await this.orders.findOne({ where: { id: dto.orderId }, relations: { items: true } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn #${dto.orderId}`);
    if (order.userId !== userId) throw new ForbiddenException('Bạn không thể thanh toán đơn của người khác');
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
      throw new ConflictException(`Đơn #${order.id} đang ở trạng thái ${order.status}, không thể thanh toán`);
    }

    const result = await this.gateway.charge({
      amount: order.total,
      method: dto.method,
      simulateFailure: dto.simulateFailure,
    });

    const payment = await this.payments.save(
      this.payments.create({
        orderId: order.id,
        amount: order.total,
        method: dto.method,
        status: result.success ? 'SUCCESS' : 'FAILED',
        failureReason: result.failureReason,
        transactionRef: result.transactionRef,
      }),
    );

    order.status = result.success ? 'PAID' : 'PAYMENT_FAILED';
    await this.orders.save(order);

    return { payment: toPaymentView(payment), order: toOrderView(order) };
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
