import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { hashPassword } from '../auth/auth.service';
import type { AuthUser } from '../auth/jwt.strategy';
import { User, toUserView } from '../users/user.entity';
import { normalizeEmail } from '../users/users.service';
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/admin.dto';

@Injectable()
export class AdminUsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async list(query: ListUsersQuery) {
    const qb = this.users.createQueryBuilder('u').orderBy('u.createdAt', 'DESC').take(200);
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.q) {
      const like = `%${query.q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(u.email) LIKE :like', { like }).orWhere('LOWER(u.fullName) LIKE :like', { like });
        }),
      );
    }
    const rows = await qb.getMany();
    return rows.map(toUserView);
  }

  /** Quản lý tạo tài khoản (thường là nhân viên quầy hoặc quản lý khác) */
  async create(dto: CreateUserDto) {
    const email = normalizeEmail(dto.email);
    if ((await this.users.count({ where: { email } })) > 0) {
      throw new ConflictException('Email đã được dùng cho một tài khoản khác');
    }
    const user = await this.users.save(
      this.users.create({
        email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash: await hashPassword(dto.password),
      }),
    );
    return toUserView(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    // Không cho tự khóa hoặc tự hạ quyền, tránh cửa hàng mất tài khoản quản lý
    if (id === actor.id) {
      if (dto.isActive === false) throw new BadRequestException('Bạn không thể tự khóa tài khoản của mình');
      if (dto.role !== undefined && dto.role !== user.role) {
        throw new BadRequestException('Bạn không thể tự đổi vai trò của mình');
      }
    }

    const patch: Partial<User> = {};
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.password !== undefined) patch.passwordHash = await hashPassword(dto.password);

    if (Object.keys(patch).length > 0) {
      await this.users.update({ id }, patch);
    }
    return toUserView(await this.users.findOneOrFail({ where: { id } }));
  }
}
