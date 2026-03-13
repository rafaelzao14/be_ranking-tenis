import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import { ChallengeIdParamDto, ChallengeQueryDto, CreateChallengeDto } from './dto/challenges.dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista desafios' })
  list(@Query() query: ChallengeQueryDto) {
    return this.challengesService.list(query.status);
  }

  @Post()
  @ApiOperation({ summary: 'Cria desafio' })
  create(@Body() dto: CreateChallengeDto) {
    return this.challengesService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui desafio' })
  remove(@Param() params: ChallengeIdParamDto) {
    return this.challengesService.remove(params.id);
  }
}
