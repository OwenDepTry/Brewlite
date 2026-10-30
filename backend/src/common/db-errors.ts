/** Nhận diện lỗi PostgreSQL (TypeORM bọc lỗi gốc trong driverError). */
function pgCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as { code?: unknown; driverError?: { code?: unknown } };
  const code = e.driverError?.code ?? e.code;
  return typeof code === 'string' ? code : undefined;
}

/** 23505 – vi phạm ràng buộc UNIQUE (vd. trùng Idempotency-Key) */
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === '23505';
}

/** 40001 serialization_failure, 40P01 deadlock_detected – an toàn để chạy lại transaction */
export function isTransientDbError(err: unknown): boolean {
  const code = pgCode(err);
  return code === '40001' || code === '40P01';
}

/** Ném ra khi UPDATE có điều kiện version không khớp – dữ liệu vừa bị transaction khác sửa */
export class OptimisticLockConflict extends Error {
  constructor(message = 'Dữ liệu vừa được cập nhật bởi giao dịch khác') {
    super(message);
    this.name = 'OptimisticLockConflict';
  }
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
}

/**
 * Chạy lại fn khi gặp xung đột optimistic lock / deadlock.
 * Lỗi nghiệp vụ (hết hàng, không hợp lệ…) được ném ra ngay, không thử lại.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 15;
  const baseDelay = opts.baseDelayMs ?? 5;

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err instanceof OptimisticLockConflict || isTransientDbError(err);
      if (!retryable || attempt >= attempts) throw err;
      // backoff có jitter để các request đồng thời không va nhau lần nữa
      const delay = baseDelay * attempt + Math.floor(Math.random() * baseDelay * 2);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
