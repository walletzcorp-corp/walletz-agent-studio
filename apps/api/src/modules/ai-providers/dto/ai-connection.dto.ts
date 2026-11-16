import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export const AI_PROVIDERS = ['anthropic', 'openai', 'gemini', 'openrouter'] as const;

export class CreateAiConnectionDto {
  @ApiProperty({ enum: AI_PROVIDERS })
  @IsIn(AI_PROVIDERS)
  provider!: (typeof AI_PROVIDERS)[number];

  @ApiProperty({ description: 'Chave de API da conta do próprio cliente no provedor. Nunca é devolvida.' })
  @IsString()
  @MinLength(16)
  @MaxLength(512)
  apiKey!: string;

  @ApiProperty({ required: false, description: 'Modelo. Sem valor, a API escolhe um modelo disponível na conta.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiProperty({ required: false, description: 'Tornar a conexão padrão da organização.' })
  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}

export class UpdateAiConnectionDto {
  @ApiProperty({ required: false, description: 'Nova chave (rotação). Validada antes de substituir a atual.' })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(512)
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class SetAgentAiConnectionDto {
  @ApiProperty({ nullable: true, description: 'Conexão usada pelo agente. null = conexão padrão da organização.' })
  @ValidateIf((_, v) => v !== null)
  @IsString()
  connectionId!: string | null;
}
