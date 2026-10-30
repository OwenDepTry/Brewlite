import { Logger } from '@nestjs/common';

const DEV_SECRET = 'brewlite-dev-secret-chi-dung-khi-phat-trien';
let warned = false;

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length > 0) return secret;
  if (!warned) {
    new Logger('Auth').warn('JWT_SECRET chưa được đặt – đang dùng khóa mặc định cho môi trường dev');
    warned = true;
  }
  return DEV_SECRET;
}

/** Thời hạn token tính bằng giây (mặc định 1 ngày) */
export function jwtExpiresInSeconds(): number {
  const value = Number(process.env.JWT_EXPIRES_IN_SECONDS);
  return Number.isFinite(value) && value > 0 ? value : 86400;
}
