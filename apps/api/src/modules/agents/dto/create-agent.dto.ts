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

type AgentTemplate = 'sdr' | 'commercial' | 'reception_scheduling' | 'customer_service' | 'post_sale' | 'collection' | 'faq' | 'custom';
type AgentTone = 'professional' | 'friendly' | 'formal' | 'casual' | 'empathetic';

export class CreateAgentDto {
  @ApiProperty({ example: 'Assistente Comercial' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false, example: 'Ana, sua consultora comercial' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    enum: ['sdr', 'commercial', 'reception_scheduling', 'customer_service', 'post_sale', 'collection', 'faq', 'custom'],
    default: 'custom',
  })
  @IsOptional()
  @IsEnum(['sdr', 'commercial', 'reception_scheduling', 'customer_service', 'post_sale', 'collection', 'faq', 'custom'])
  template?: AgentTemplate;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  persona?: {
    description?: string;
    backstory?: string;
    traits?: string[];
  };

  @ApiProperty({
    enum: ['professional', 'friendly', 'formal', 'casual', 'empathetic'],
    default: 'professional',
  })
  @IsOptional()
  @IsEnum(['professional', 'friendly', 'formal', 'casual', 'empathetic'])
  tone?: AgentTone;

  @ApiProperty({ default: 'pt-BR' })
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
}
