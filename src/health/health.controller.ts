import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Public()
  @Get('/')
  @ApiOperation({ summary: 'Healthcheck da API' })
  @ApiOkResponse({ schema: { example: { ok: true, name: 'ranking-tenis-backend' } } })
  root() {
    return { ok: true, name: 'ranking-tenis-backend' };
  }
}
