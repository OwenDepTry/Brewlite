import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { buildTypeOrmOptions } from './typeorm.config';

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: () => buildTypeOrmOptions(process.env.DATABASE_URL) })],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}
