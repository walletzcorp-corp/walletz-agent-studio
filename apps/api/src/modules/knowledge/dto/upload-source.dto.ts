import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type KnowledgeSourceType = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'html' | 'url' | 'faq' | 'typed';

export class UploadSourceDto {
  @ApiPropertyOptional({ description: 'Custom name for the source (defaults to filename)' })
  @IsOptional()
  @IsString()
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
  @ApiProperty({ description: 'Source name / title' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Text content' })
  @IsString()
  content!: string;

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
