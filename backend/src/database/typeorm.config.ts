import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Cấu hình TypeORM dùng chung cho app và test.
 * synchronize=true: tự tạo bảng theo entity (phù hợp MVP/bài tập lớn).
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
    ...overrides,
  } as TypeOrmModuleOptions;
}
