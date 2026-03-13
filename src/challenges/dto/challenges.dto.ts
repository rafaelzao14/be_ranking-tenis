import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ChallengeStatus } from '../../database/enums';

export class CreateChallengeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  challengerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  challengedId!: string;

  @ApiPropertyOptional({ minimum: 1, default: 10 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}

export class ChallengeQueryDto {
  @ApiPropertyOptional({ enum: ChallengeStatus })
  @IsOptional()
  @IsEnum(ChallengeStatus)
  status?: ChallengeStatus;
}

export class ChallengeIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
