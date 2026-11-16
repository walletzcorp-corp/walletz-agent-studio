import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Conexão com o app Meta do PRÓPRIO cliente (WhatsApp Cloud API oficial). */
export class ConnectWhatsappDto {
  @ApiProperty({ description: 'Phone Number ID (WhatsApp → Configuração da API, no app Meta do cliente)' })
  @IsString()
  @Matches(/^\d{5,30}$/, { message: 'Phone Number ID deve conter só números' })
  phoneNumberId!: string;

  @ApiProperty({ description: 'ID da conta do WhatsApp Business (WABA ID)' })
  @IsString()
  @Matches(/^\d{5,30}$/, { message: 'WABA ID deve conter só números' })
  wabaId!: string;

  @ApiProperty({ description: 'Token permanente de Usuário do Sistema com whatsapp_business_messaging e whatsapp_business_management' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  accessToken!: string;

  @ApiProperty({ description: 'App ID do app Meta do cliente' })
  @IsString()
  @Matches(/^\d{5,30}$/, { message: 'App ID deve conter só números' })
  appId!: string;

  @ApiProperty({ description: 'App Secret do app Meta do cliente (valida a assinatura dos webhooks)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  appSecret!: string;

  @ApiProperty({ required: false, description: 'Agente que responde neste número' })
  @IsOptional()
  @IsString()
  agentId?: string;
}

export class UpdateWhatsappCredentialsDto {
  @ApiProperty({ description: 'App ID do app Meta (necessário para validar)' })
  @IsString()
  @Matches(/^\d{5,30}$/, { message: 'App ID deve conter só números' })
  appId!: string;

  @ApiProperty({ required: false, description: 'Novo token permanente' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  accessToken?: string;

  @ApiProperty({ required: false, description: 'Novo App Secret' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  appSecret?: string;
}

export class SetWhatsappAgentDto {
  @ApiProperty({ nullable: true, description: 'Agente do número; null = primeiro agente publicado' })
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  agentId!: string | null;
}

export class EmbeddedSignupDto {
  @ApiProperty({ description: 'Authorization code returned by Meta Embedded Signup' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Connection path: existing WhatsApp Business or new number', required: false })
  @IsOptional()
  @IsString()
  path?: 'existing' | 'new';

  @ApiProperty({ description: 'WABA ID from Embedded Signup session info (if provided by Meta)', required: false })
  @IsOptional()
  @IsString()
  wabaId?: string;

  @ApiProperty({ description: 'Phone Number ID from Embedded Signup session info (if provided by Meta)', required: false })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
