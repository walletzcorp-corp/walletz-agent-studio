import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ description: 'Código TOTP de 6 dígitos (MFA)' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  mfaCode?: string;
}
