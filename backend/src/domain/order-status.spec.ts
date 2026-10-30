import {
  InvalidOrderTransitionError,
  ORDER_STATUSES,
  type OrderStatus,
  assertTransition,
  canTransition,
  isFinalStatus,
} from './order-status';

/** Các mũi tên trong sơ đồ Mục 9.1 của đề */
const ALLOWED: Array<[OrderStatus, OrderStatus]> = [
  ['PENDING', 'PAID'],
  ['PENDING', 'PAYMENT_FAILED'],
  ['PENDING', 'CANCELLED'],
  ['PAYMENT_FAILED', 'PENDING'],
  ['PAYMENT_FAILED', 'CANCELLED'],
  ['PAID', 'PREPARING'],
  ['PAID', 'CANCELLED'],
  ['PREPARING', 'READY'],
  ['READY', 'COMPLETED'],
];

const key = (from: OrderStatus, to: OrderStatus) => `${from}->${to}`;
const allowedKeys = new Set(ALLOWED.map(([f, t]) => key(f, t)));
const ALL_PAIRS = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as [OrderStatus, OrderStatus]));
const FORBIDDEN = ALL_PAIRS.filter(([f, t]) => !allowedKeys.has(key(f, t)));

describe('Order State Machine', () => {
  it('luồng thành công PENDING → PAID → PREPARING → READY → COMPLETED', () => {
    let status: OrderStatus = 'PENDING';
    for (const next of ['PAID', 'PREPARING', 'READY', 'COMPLETED'] as OrderStatus[]) {
      status = assertTransition(status, next);
    }
    expect(status).toBe('COMPLETED');
  });

  it.each(ALLOWED)('cho phép %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(assertTransition(from, to)).toBe(to);
  });

  it.each(FORBIDDEN)('chặn %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(InvalidOrderTransitionError);
  });

  it('kiểm tra đủ mọi cặp trạng thái (7 × 7)', () => {
    expect(ALLOWED.length + FORBIDDEN.length).toBe(49);
  });

  it('thông báo lỗi nêu rõ trạng thái nguồn và đích', () => {
    expect(() => assertTransition('PENDING', 'READY')).toThrow('Không thể chuyển đơn từ PENDING sang READY');
    try {
      assertTransition('COMPLETED', 'CANCELLED');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidOrderTransitionError);
      expect((e as InvalidOrderTransitionError).from).toBe('COMPLETED');
      expect((e as InvalidOrderTransitionError).to).toBe('CANCELLED');
    }
  });

  it('COMPLETED và CANCELLED là trạng thái kết thúc', () => {
    expect(isFinalStatus('COMPLETED')).toBe(true);
    expect(isFinalStatus('CANCELLED')).toBe(true);
    for (const s of ['PENDING', 'PAID', 'PAYMENT_FAILED', 'PREPARING', 'READY'] as OrderStatus[]) {
      expect(isFinalStatus(s)).toBe(false);
    }
  });

  it('không thể thanh toán lại đơn đã PAID (PAID → PAID bị chặn)', () => {
    expect(() => assertTransition('PAID', 'PAID')).toThrow(InvalidOrderTransitionError);
  });
});
