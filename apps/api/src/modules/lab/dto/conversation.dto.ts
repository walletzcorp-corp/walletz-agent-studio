import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabConversationDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  agentId!: string;
}

export class RenameLabConversationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;
}

export class LabChatWithConversationDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  agentId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  message!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  conversationId?: string;
}
