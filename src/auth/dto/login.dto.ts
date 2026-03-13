import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({ example: 'secret' })
  @IsString()
  @MinLength(1)
  password!: string;
}
