import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectWhatsappDto {
  @ApiProperty({ description: 'Phone Number ID from Meta Developer Console' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @ApiProperty({ description: 'WhatsApp Business Account ID' })
  @IsString()
  @IsNotEmpty()
  wabaId!: string;

  @ApiProperty({ description: 'Permanent or System User access token' })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiProperty({ description: 'App Secret for webhook signature verification', required: false })
  @IsOptional()
  @IsString()
  appSecret?: string;

  @ApiProperty({ description: 'Custom webhook verify token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  verifyToken!: string;

  @ApiProperty({ description: 'Public webhook URL where Meta will send events' })
  @IsString()
  @IsNotEmpty()
  webhookUrl!: string;
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
