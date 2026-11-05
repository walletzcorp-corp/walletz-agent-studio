import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgentCalendarSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canSchedule?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) @Max(480) defaultDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(120) bufferMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(20) maxMeetingsPerDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minLeadTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPlatform?: string;
  @ApiPropertyOptional() @IsOptional() availableHours?: Record<
    string,
    { start: string | null; end: string | null; enabled: boolean }
  >;
  @ApiPropertyOptional() @IsOptional() @IsString() connectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timeZone?: string;
}
