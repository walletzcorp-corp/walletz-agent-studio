import { IsString, IsOptional, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';

export class ChangeOrganizationStatusDto {
  @ApiProperty({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 500)
  reason?: string;
}
