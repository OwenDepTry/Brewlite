import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Cấu hình TypeORM dùng chung cho app và test.
 * - synchronize=true: tự tạo bảng theo entity (phù hợp MVP/bài tập lớn). Đặt DB_SYNC=false để tắt.
 * - DB_DROP_SCHEMA=true: xóa sạch bảng khi khởi động (chỉ dùng cho test tích hợp).
 */
export function buildTypeOrmOptions(
  url: string | undefined,
  overrides: Partial<TypeOrmModuleOptions> = {},
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: url ?? 'postgres://brewlite:brewlite@localhost:5432/brewlite',
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNC !== 'false',
    dropSchema: process.env.DB_DROP_SCHEMA === 'true',
    extra: { max: Number(process.env.DB_POOL_SIZE ?? 20) },
    ...overrides,
  } as TypeOrmModuleOptions;
}
