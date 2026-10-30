import { SIZE_SURCHARGE, isSize, lineTotal, unitPrice } from './pricing';

describe('pricing', () => {
  it('size S giữ nguyên giá gốc, M +5.000đ, L +10.000đ', () => {
    expect(unitPrice(45000, 'S')).toBe(45000);
    expect(unitPrice(45000, 'M')).toBe(45000 + SIZE_SURCHARGE.M);
    expect(unitPrice(45000, 'L')).toBe(55000);
  });

  it('cộng giá topping', () => {
    expect(unitPrice(39000, 'M', [5000, 10000])).toBe(39000 + 5000 + 5000 + 10000);
  });

  it('thành tiền = đơn giá × số lượng', () => {
    expect(lineTotal(50000, 3)).toBe(150000);
  });

  it('nhận diện size hợp lệ', () => {
    expect(isSize('M')).toBe(true);
    expect(isSize('XL')).toBe(false);
    expect(isSize(undefined)).toBe(false);
  });
});
