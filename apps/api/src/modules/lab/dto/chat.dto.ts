import { IsString, IsOptional, IsArray, ValidateNested, IsUUID, MaxLength, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  content!: string;
}

export class LabChatDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  agentId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  message!: string;

  /** ID da conversa de lab (cria automaticamente se omitido). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  labConversationId?: string;

  /** @deprecated Mantido por compatibilidade; use labConversationId */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactId?: string;
}

export class CreateLabConversationDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  agentId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class UpdateLabConversationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
