import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaSetupDto {
  @ApiProperty({ description: 'TOTP code from authenticator app', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class DisableMfaDto {
  @ApiProperty({ description: 'Current account password for confirmation' })
  @IsString()
  password!: string;
}
