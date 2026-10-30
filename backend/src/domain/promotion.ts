/**
 * Quy tắc khuyến mãi và điểm thưởng – thuần TypeScript để unit test.
 */

export interface PromotionRule {
  code: string;
  /** Phần trăm giảm (1–100) */
  percentOff: number;
  /** Số tiền giảm tối đa, null = không giới hạn */
  maxDiscount: number | null;
  /** Tổng tiền hàng tối thiểu để áp dụng */
  minOrderTotal: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  /** Tổng số lượt được dùng, null = không giới hạn */
  usageLimit: number | null;
  usedCount: number;
}

export type PromotionResult = { ok: true; discount: number } | { ok: false; reason: string };

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function evaluatePromotion(promo: PromotionRule, subtotal: number, now: Date = new Date()): PromotionResult {
  if (!promo.active) {
    return { ok: false, reason: `Mã ${promo.code} đang ngừng áp dụng` };
  }
  if (now < promo.startsAt) {
    return { ok: false, reason: `Mã ${promo.code} chưa đến thời gian áp dụng` };
  }
  if (now > promo.endsAt) {
    return { ok: false, reason: `Mã ${promo.code} đã hết hạn` };
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, reason: `Mã ${promo.code} đã hết lượt sử dụng` };
  }
  if (subtotal < promo.minOrderTotal) {
    return {
      ok: false,
      reason: `Mã ${promo.code} áp dụng cho đơn từ ${promo.minOrderTotal.toLocaleString('vi-VN')}đ`,
    };
  }

  let discount = Math.floor((subtotal * promo.percentOff) / 100);
  if (promo.maxDiscount !== null) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.max(0, Math.min(discount, subtotal));
  return { ok: true, discount };
}

/** 1 điểm cho mỗi 10.000đ đã thanh toán */
export const VND_PER_LOYALTY_POINT = 10000;

export function loyaltyPointsFor(totalPaid: number): number {
  if (totalPaid <= 0) return 0;
  return Math.floor(totalPaid / VND_PER_LOYALTY_POINT);
}
