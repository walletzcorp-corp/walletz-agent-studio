import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingPlatformDto } from './create-meeting.dto';

/** Expediente do agente; horários sempre em Brasília. */
export class UpdateAgentCalendarSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canSchedule?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) @Max(480) defaultDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(120) bufferMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(20) maxMeetingsPerDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(43200) minLeadTimeMinutes?: number;
  @ApiPropertyOptional({ enum: MeetingPlatformDto }) @IsOptional() @IsEnum(MeetingPlatformDto) defaultPlatform?: MeetingPlatformDto;
  @ApiPropertyOptional({
    description: 'Por dia (mon…sun): { enabled, start: "HH:mm", end: "HH:mm" }, horário de Brasília',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional() @IsObject() availableHours?: Record<string, { start: string | null; end: string | null; enabled: boolean }>;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Agenda conectada; null desvincula' })
  @ValidateIf((o: UpdateAgentCalendarSettingsDto) => o.connectionId !== undefined && o.connectionId !== null)
  @IsString() connectionId?: string | null;
}
