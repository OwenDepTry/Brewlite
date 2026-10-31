import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, toUserView } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

export const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** Đăng ký công khai: luôn là CUSTOMER. Tài khoản nhân viên/quản lý do quản lý tạo. */
  async register(dto: RegisterDto) {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException('Email đã được đăng ký');
    }
    const passwordHash = await hashPassword(dto.password);
    const user = await this.users.create({ email: dto.email, fullName: dto.fullName, passwordHash, role: 'CUSTOMER' });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithHash(dto.email);
    // Cùng một thông báo cho sai email/sai mật khẩu để không lộ email nào đã tồn tại
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa, vui lòng liên hệ quản lý cửa hàng');
    }
    return this.issueToken(user);
  }

  async me(userId: string) {
    return toUserView(await this.users.findById(userId));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return toUserView(await this.users.updateProfile(userId, { fullName: dto.fullName }));
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findByIdWithHash(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    await this.users.setPasswordHash(userId, await hashPassword(dto.newPassword));
    return { message: 'Đã đổi mật khẩu' };
  }

  private async issueToken(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: toUserView(user),
    };
  }
}
