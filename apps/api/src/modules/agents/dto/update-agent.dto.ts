import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAgentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ required: false, description: 'Objetivo principal: texto longo, vários parágrafos, sem limite funcional de caracteres' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  persona?: {
    description?: string;
    backstory?: string;
    traits?: string[];
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['professional', 'friendly', 'formal', 'casual', 'empathetic'])
  tone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  channels?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  workingHours?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  handoffCriteria?: Record<string, unknown>;
}
