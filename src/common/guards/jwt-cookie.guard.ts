import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const cookieToken = req.cookies?.access_token as string | undefined;
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;

    const token = cookieToken ?? bearer;
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      req.user = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
