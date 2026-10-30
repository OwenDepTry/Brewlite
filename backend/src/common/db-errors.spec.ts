import { OptimisticLockConflict, isTransientDbError, isUniqueViolation, withRetry } from './db-errors';

describe('withRetry', () => {
  it('chạy lại khi gặp OptimisticLockConflict cho tới khi thành công', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new OptimisticLockConflict();
        return 'ok';
      },
      { baseDelayMs: 1 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('không chạy lại lỗi nghiệp vụ', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new Error('Hết hàng');
      }),
    ).rejects.toThrow('Hết hàng');
    expect(calls).toBe(1);
  });

  it('dừng sau số lần thử tối đa', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new OptimisticLockConflict();
        },
        { attempts: 4, baseDelayMs: 1 },
      ),
    ).rejects.toBeInstanceOf(OptimisticLockConflict);
    expect(calls).toBe(4);
  });

  it('chạy lại khi PostgreSQL báo deadlock', async () => {
    let calls = 0;
    await withRetry(
      async () => {
        calls++;
        if (calls === 1) throw Object.assign(new Error('deadlock'), { driverError: { code: '40P01' } });
      },
      { baseDelayMs: 1 },
    );
    expect(calls).toBe(2);
  });
});

describe('nhận diện lỗi PostgreSQL', () => {
  it('23505 là vi phạm UNIQUE', () => {
    expect(isUniqueViolation({ driverError: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
  });

  it('40001 / 40P01 là lỗi tạm thời', () => {
    expect(isTransientDbError({ code: '40001' })).toBe(true);
    expect(isTransientDbError({ code: '40P01' })).toBe(true);
    expect(isTransientDbError({ code: '23505' })).toBe(false);
  });
});
