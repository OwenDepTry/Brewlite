import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /** Lấy kèm passwordHash – chỉ dùng cho đăng nhập */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async existsByEmail(email: string): Promise<boolean> {
    return (await this.users.count({ where: { email: normalizeEmail(email) } })) > 0;
  }

  create(data: { email: string; fullName: string; passwordHash: string; role?: UserRole }): Promise<User> {
    return this.users.save(
      this.users.create({ ...data, email: normalizeEmail(data.email), role: data.role ?? 'CUSTOMER' }),
    );
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
