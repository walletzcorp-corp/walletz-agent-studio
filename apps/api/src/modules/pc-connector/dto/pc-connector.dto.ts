import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrictBoolean } from '../../../shared/validation/strict-boolean.decorator';

export class UpdateCapabilitiesDto {
  @ApiProperty({ description: 'Mapa grupo -> flags booleanas (files, apps, browser, system)' })
  @IsObject()
  capabilities!: Record<string, unknown>;
}

export class ApproveCommandDto {
  @ApiProperty()
  @StrictBoolean()
  approved!: boolean;
}

export class PairDeviceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  token!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deviceName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  platform!: string;
}

export class CommandResultDto {
  @ApiProperty()
  @StrictBoolean()
  success!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  error?: string;
}
