import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { jwtSecret } from './jwt.config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/** Thông tin user gắn vào request sau khi xác thực JWT */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
    });
  }

  /**
   * Đọc lại tài khoản từ CSDL ở mỗi request: tài khoản bị khóa hoặc bị đổi vai trò
   * có hiệu lực ngay, không phải chờ token hết hạn.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findByIdOrNull(payload.sub);
    if (!user) throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ, vui lòng đăng nhập lại');
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị khóa, vui lòng liên hệ quản lý cửa hàng');
    return { id: user.id, email: user.email, role: user.role };
  }
}
