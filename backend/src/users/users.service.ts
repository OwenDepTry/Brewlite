import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /** Lấy kèm passwordHash – chỉ dùng cho đăng nhập / đổi mật khẩu */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  findByIdWithHash(id: string): Promise<User | null> {
    return this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id', { id }).getOne();
  }

  async existsByEmail(email: string): Promise<boolean> {
    return (await this.users.count({ where: { email: normalizeEmail(email) } })) > 0;
  }

  create(data: { email: string; fullName: string; passwordHash: string; role?: UserRole }): Promise<User> {
    return this.users.save(
      this.users.create({ ...data, email: normalizeEmail(data.email), role: data.role ?? 'CUSTOMER' }),
    );
  }

  findByIdOrNull(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.findByIdOrNull(id);
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  async updateProfile(id: string, data: { fullName?: string }): Promise<User> {
    const user = await this.findById(id);
    if (data.fullName !== undefined) user.fullName = data.fullName;
    return this.users.save(user);
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.users.update({ id }, { passwordHash });
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
