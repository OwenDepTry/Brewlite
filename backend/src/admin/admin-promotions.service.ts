import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../promotions/promotion.entity';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/admin.dto';

@Injectable()
export class AdminPromotionsService {
  constructor(@InjectRepository(Promotion) private readonly promotions: Repository<Promotion>) {}

  list() {
    return this.promotions.find({ order: { endsAt: 'DESC', code: 'ASC' } });
  }

  async create(dto: CreatePromotionDto) {
    if (await this.promotions.findOne({ where: { code: dto.code } })) {
      throw new ConflictException(`Mã ${dto.code} đã tồn tại`);
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    assertDateRange(startsAt, endsAt);

    return this.promotions.save(
      this.promotions.create({
        code: dto.code,
        description: dto.description ?? '',
        percentOff: dto.percentOff,
        maxDiscount: dto.maxDiscount ?? null,
        minOrderTotal: dto.minOrderTotal ?? 0,
        startsAt,
        endsAt,
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
        active: dto.active ?? true,
      }),
    );
  }

  async update(code: string, dto: UpdatePromotionDto) {
    const promo = await this.promotions.findOne({ where: { code: code.toUpperCase() } });
    if (!promo) throw new NotFoundException(`Không tìm thấy mã ${code}`);

    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.percentOff !== undefined) promo.percentOff = dto.percentOff;
    if (dto.maxDiscount !== undefined) promo.maxDiscount = dto.maxDiscount;
    if (dto.minOrderTotal !== undefined) promo.minOrderTotal = dto.minOrderTotal;
    if (dto.startsAt !== undefined) promo.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) promo.endsAt = new Date(dto.endsAt);
    if (dto.usageLimit !== undefined) {
      if (dto.usageLimit !== null && dto.usageLimit < promo.usedCount) {
        throw new BadRequestException(`Mã đã được dùng ${promo.usedCount} lượt, giới hạn mới phải từ ${promo.usedCount} trở lên`);
      }
      promo.usageLimit = dto.usageLimit;
    }
    if (dto.active !== undefined) promo.active = dto.active;
    assertDateRange(promo.startsAt, promo.endsAt);

    // Không ghi đè usedCount (đơn đang đặt có thể tăng cùng lúc)
    const { usedCount: _ignored, ...rest } = promo;
    await this.promotions.update({ code: promo.code }, rest);
    return this.promotions.findOneOrFail({ where: { code: promo.code } });
  }
}

function assertDateRange(startsAt: Date, endsAt: Date) {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new BadRequestException('Ngày không hợp lệ');
  }
  if (endsAt <= startsAt) {
    throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
  }
}
