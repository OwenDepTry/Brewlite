import { BadRequestException } from '@nestjs/common';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
const KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,100}$/;

/**
 * Kiểm tra giá trị header Idempotency-Key.
 * required=false: không gửi header thì trả về null (vd. POST /orders).
 */
export function parseIdempotencyKey(raw: string | string[] | undefined, required: boolean): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') {
    if (required) throw new BadRequestException('Thiếu header Idempotency-Key');
    return null;
  }
  const key = value.trim();
  if (!KEY_PATTERN.test(key)) {
    throw new BadRequestException('Idempotency-Key phải dài 8–100 ký tự, chỉ gồm chữ, số và - _ : .');
  }
  return key;
}
