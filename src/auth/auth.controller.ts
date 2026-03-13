import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Realiza login e define cookie de sessao' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, expiresIn } = await this.authService.login(dto);

    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn * 1000,
      path: '/',
    });

    return { ok: true };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Limpa cookie de autenticacao' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Valida sessao atual' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  me() {
    return { ok: true };
  }
}
