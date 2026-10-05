import {
  IsString, IsOptional, IsEnum, IsArray, IsNumber, IsDateString, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type KnowledgeItemType = 'fact' | 'guidance' | 'procedure' | 'permission' | 'example';

export class CreateKnowledgeItemDto {
  @ApiProperty({ enum: ['fact', 'guidance', 'procedure', 'permission', 'example'] })
  @IsEnum(['fact', 'guidance', 'procedure', 'permission', 'example'])
  type!: KnowledgeItemType;

  @ApiProperty({ description: 'The actual knowledge content' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Contextual note for when this applies' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Agent this applies to (null = all agents)' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Confidence 0.0–1.0', default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'ISO date when this knowledge expires' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateKnowledgeItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
