import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonthlyRankingQueryDto } from './dto';
import { RankingService } from './ranking.service';

@ApiTags('Ranking')
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Ranking mensal' })
  monthly(@Query() query: MonthlyRankingQueryDto) {
    return this.rankingService.monthly(query.month);
  }
}
