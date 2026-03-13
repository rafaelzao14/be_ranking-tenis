import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { MatchType } from '../../database/enums';

export class MatchesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  playerId?: string;

  @ApiPropertyOptional({ enum: MatchType })
  @IsOptional()
  @IsEnum(MatchType)
  type?: MatchType;

  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;
}

export class CreateMatchDto {
  @ApiProperty({ enum: MatchType })
  @IsEnum(MatchType)
  type!: MatchType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  challengeId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  player1Id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  player2Id!: string;

  @ApiProperty({ minimum: 0 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  sets1!: number;

  @ApiProperty({ minimum: 0 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  sets2!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  winnerId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Boolean(value)))
  @IsBoolean()
  wo?: boolean;

  @ApiPropertyOptional({ example: '2026-03-12T11:00:00.000Z' })
  @IsOptional()
  @IsString()
  playedAt?: string;
}
