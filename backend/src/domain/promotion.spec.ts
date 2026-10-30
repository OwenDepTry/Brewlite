import { type PromotionRule, evaluatePromotion, loyaltyPointsFor, normalizePromoCode } from './promotion';

const NOW = new Date('2026-10-31T10:00:00+07:00');

function promo(overrides: Partial<PromotionRule> = {}): PromotionRule {
  return {
    code: 'WELCOME10',
    percentOff: 10,
    maxDiscount: 20000,
    minOrderTotal: 50000,
    startsAt: new Date('2026-01-01T00:00:00+07:00'),
    endsAt: new Date('2027-12-31T23:59:59+07:00'),
    active: true,
    usageLimit: null,
    usedCount: 0,
    ...overrides,
  };
}

describe('evaluatePromotion', () => {
  it('giảm theo phần trăm', () => {
    expect(evaluatePromotion(promo(), 90000, NOW)).toEqual({ ok: true, discount: 9000 });
  });

  it('không vượt quá mức giảm tối đa', () => {
    expect(evaluatePromotion(promo(), 500000, NOW)).toEqual({ ok: true, discount: 20000 });
  });

  it('không giới hạn mức giảm khi maxDiscount = null', () => {
    expect(evaluatePromotion(promo({ maxDiscount: null }), 500000, NOW)).toEqual({ ok: true, discount: 50000 });
  });

  it('làm tròn xuống tới đồng', () => {
    expect(evaluatePromotion(promo({ percentOff: 15, minOrderTotal: 0 }), 33333, NOW)).toEqual({
      ok: true,
      discount: 4999,
    });
  });

  it('từ chối đơn chưa đạt giá trị tối thiểu', () => {
    const r = evaluatePromotion(promo(), 49999, NOW);
    expect(r.ok).toBe(false);
  });

  it('chấp nhận đúng bằng giá trị tối thiểu', () => {
    expect(evaluatePromotion(promo(), 50000, NOW)).toEqual({ ok: true, discount: 5000 });
  });

  it('từ chối mã hết hạn', () => {
    const r = evaluatePromotion(promo({ endsAt: new Date('2025-08-31T23:59:59+07:00') }), 100000, NOW);
    expect(r).toEqual({ ok: false, reason: 'Mã WELCOME10 đã hết hạn' });
  });

  it('từ chối mã chưa tới ngày áp dụng', () => {
    const r = evaluatePromotion(promo({ startsAt: new Date('2027-01-01T00:00:00+07:00') }), 100000, NOW);
    expect(r.ok).toBe(false);
  });

  it('từ chối mã đã tắt', () => {
    expect(evaluatePromotion(promo({ active: false }), 100000, NOW).ok).toBe(false);
  });

  it('từ chối mã đã hết lượt', () => {
    expect(evaluatePromotion(promo({ usageLimit: 3, usedCount: 3 }), 100000, NOW).ok).toBe(false);
    expect(evaluatePromotion(promo({ usageLimit: 3, usedCount: 2 }), 100000, NOW).ok).toBe(true);
  });

  it('giảm giá không bao giờ lớn hơn tổng tiền', () => {
    expect(evaluatePromotion(promo({ percentOff: 100, maxDiscount: null, minOrderTotal: 0 }), 35000, NOW)).toEqual({
      ok: true,
      discount: 35000,
    });
  });
});

describe('normalizePromoCode', () => {
  it('bỏ khoảng trắng và viết hoa', () => {
    expect(normalizePromoCode('  welcome10 ')).toBe('WELCOME10');
  });
});

describe('loyaltyPointsFor', () => {
  it('1 điểm cho mỗi 10.000đ, làm tròn xuống', () => {
    expect(loyaltyPointsFor(0)).toBe(0);
    expect(loyaltyPointsFor(9999)).toBe(0);
    expect(loyaltyPointsFor(10000)).toBe(1);
    expect(loyaltyPointsFor(123000)).toBe(12);
  });

  it('không âm', () => {
    expect(loyaltyPointsFor(-5000)).toBe(0);
  });
});
