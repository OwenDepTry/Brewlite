import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PaymentMethod } from './payment.entity';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
  /** Cổng thật (Stripe, VNPay…) cũng nhận khóa idempotent để không trừ tiền 2 lần */
  idempotencyKey: string;
  /** Bật để mô phỏng giao dịch bị từ chối (dùng khi demo/test) */
  simulateFailure?: boolean;
}

export interface ChargeResult {
  success: boolean;
  transactionRef: string | null;
  failureReason: string | null;
}

/**
 * Cổng thanh toán giả lập (thay cho Momo/VNPay/Stripe).
 * Không gọi ra ngoài; trả kết quả sau một độ trễ nhỏ như cổng thật.
 * Đếm số lần trừ tiền để test chứng minh không bị trừ 2 lần.
 */
@Injectable()
export class MockPaymentGateway {
  private readonly latencyMs = Number(process.env.MOCK_PAYMENT_LATENCY_MS ?? 120);
  private readonly charged = new Map<string, ChargeResult>();
  successfulCharges = 0;

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    // Cùng khóa => trả lại kết quả cũ, không trừ tiền lần nữa
    const previous = this.charged.get(req.idempotencyKey);
    if (previous) return previous;

    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    let result: ChargeResult;
    if (req.simulateFailure) {
      result = {
        success: false,
        transactionRef: null,
        failureReason: req.method === 'WALLET' ? 'Số dư ví không đủ' : 'Thẻ bị ngân hàng từ chối',
      };
    } else if (req.amount <= 0) {
      result = { success: false, transactionRef: null, failureReason: 'Số tiền thanh toán không hợp lệ' };
    } else {
      result = {
        success: true,
        transactionRef: `${req.method === 'WALLET' ? 'WAL' : 'CRD'}-${randomUUID().slice(0, 12).toUpperCase()}`,
        failureReason: null,
      };
      this.successfulCharges++;
    }

    this.charged.set(req.idempotencyKey, result);
    return result;
  }
}
