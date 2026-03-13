import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMatchDto, MatchesQueryDto } from './dto/matches.dto';
import { MatchesService } from './matches.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista partidas' })
  list(@Query() query: MatchesQueryDto) {
    return this.matchesService.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Cria partida e atualiza ranking' })
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.create(dto);
  }
}
