import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePlayerDto {
  @ApiProperty({ example: 'Maria' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '1995-03-22' })
  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Boolean(value)))
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Boolean(value)))
  @IsBoolean()
  participates?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 1, example: 9 })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  currentRank?: number | null;
}

export class PlayerIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
