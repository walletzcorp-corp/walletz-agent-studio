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

  @ApiProperty({ type: [ChatMessageDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}
