import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PaymentMethod } from './payment.entity';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
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
 */
@Injectable()
export class MockPaymentGateway {
  private readonly latencyMs = Number(process.env.MOCK_PAYMENT_LATENCY_MS ?? 120);

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    if (req.simulateFailure) {
      return {
        success: false,
        transactionRef: null,
        failureReason: req.method === 'WALLET' ? 'Số dư ví không đủ' : 'Thẻ bị ngân hàng từ chối',
      };
    }
    if (req.amount <= 0) {
      return { success: false, transactionRef: null, failureReason: 'Số tiền thanh toán không hợp lệ' };
    }

    return {
      success: true,
      transactionRef: `${req.method === 'WALLET' ? 'WAL' : 'CRD'}-${randomUUID().slice(0, 12).toUpperCase()}`,
      failureReason: null,
    };
  }
}
