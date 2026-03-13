import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto) {
    const expectedUser = process.env.AUTH_USER ?? 'admin';
    const expectedPassword = process.env.AUTH_PASSWORD ?? 'admin123';

    if (dto.username !== expectedUser || dto.password !== expectedPassword) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const expiresIn = Number(process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS ?? 60 * 60 * 12);

    const token = await this.jwtService.signAsync(
      {
        sub: dto.username,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me',
        expiresIn,
      },
    );

    return { token, expiresIn };
  }
}
