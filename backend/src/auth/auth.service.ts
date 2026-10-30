import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, toUserView } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException('Email đã được đăng ký');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({ email: dto.email, fullName: dto.fullName, passwordHash });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithHash(dto.email);
    // Cùng một thông báo cho sai email/sai mật khẩu để không lộ email nào đã tồn tại
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.issueToken(user);
  }

  async me(userId: string) {
    return toUserView(await this.users.findById(userId));
  }

  private async issueToken(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: toUserView(user),
    };
  }
}
