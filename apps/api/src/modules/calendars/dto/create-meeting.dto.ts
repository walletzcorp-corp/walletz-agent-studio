import { IsString, IsNotEmpty, IsISO8601, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MeetingPlatformDto {
  GOOGLE_MEET = 'google_meet',
  TEAMS = 'teams',
  PRESENCIAL = 'presencial',
  PHONE = 'phone',
}

export class CreateMeetingDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
  @ApiProperty() @IsISO8601() startAt!: string;
  @ApiProperty() @IsISO8601() endAt!: string;
  @ApiPropertyOptional({ enum: MeetingPlatformDto }) @IsOptional() @IsEnum(MeetingPlatformDto) platform?: MeetingPlatformDto;
  @ApiPropertyOptional() @IsOptional() @IsString() agentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() connectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timeZone?: string;
}

export class RescheduleMeetingDto {
  @ApiProperty() @IsISO8601() startAt!: string;
  @ApiProperty() @IsISO8601() endAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class CancelMeetingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
