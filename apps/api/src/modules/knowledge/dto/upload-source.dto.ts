import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type KnowledgeSourceType = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'html' | 'url' | 'faq' | 'typed';

export class UploadSourceDto {
  @ApiPropertyOptional({ description: 'Custom name for the source (defaults to filename)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Restrict this source to a specific agent' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Priority 0-100 for RAG retrieval', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ description: 'Language code, e.g. pt-BR', default: 'pt-BR' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class CreateUrlSourceDto {
  @ApiProperty({ description: 'URL to crawl and index' })
  @IsString()
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;
}

export class CreateTypedSourceDto {
  @ApiProperty({ description: 'Título' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Conteúdo (sem limite funcional; o limite técnico é KNOWLEDGE_MAX_FILE_SIZE_MB)' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Contexto opcional (quando/como usar este conteúdo)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SetSourceAgentDto {
  @ApiProperty({ nullable: true, description: 'Agente específico; null = compartilhado com todos os agentes' })
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  agentId!: string | null;
}
