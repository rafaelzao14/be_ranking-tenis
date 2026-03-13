import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePlayerDto, PlayerIdParamDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista atletas' })
  list() {
    return this.playersService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca atleta por id' })
  getById(@Param() params: PlayerIdParamDto) {
    return this.playersService.getById(params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria atleta' })
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza atleta (PATCH)' })
  patch(@Param() params: PlayerIdParamDto, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(params.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza atleta (PUT)' })
  put(@Param() params: PlayerIdParamDto, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(params.id, dto);
  }
}
