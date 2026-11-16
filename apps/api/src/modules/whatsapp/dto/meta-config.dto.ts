import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveMetaConfigDto {
  @ApiProperty({ description: 'Meta App ID' })
  @IsString()
  @MaxLength(64)
  appId!: string;

  @ApiProperty({ description: 'Embedded Signup Config ID' })
  @IsString()
  @MaxLength(64)
  configId!: string;

  @ApiPropertyOptional({ description: 'App Secret (backend-only, stored encrypted)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  appSecret?: string;

  @ApiPropertyOptional({ description: 'Webhook verify token (stored encrypted)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  verifyToken?: string;

  @ApiPropertyOptional({ description: 'Graph API version, e.g. v22.0' })
  @IsOptional()
  @IsString()
  @Matches(/^v\d+\.\d+$/, { message: 'Graph API version must match vNN.N format' })
  graphApiVersion?: string;
}
