import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class MonthlyRankingQueryDto {
  @ApiPropertyOptional({ example: '2026-03' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}
