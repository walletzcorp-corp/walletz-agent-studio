import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetToolPermissionDto {
  @ApiProperty({ example: 'schedule_appointment' })
  @IsString()
  toolName!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowed!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  constraints?: Record<string, unknown>;
}

export class BatchToolPermissionsDto {
  @ApiProperty({ type: [SetToolPermissionDto] })
  permissions!: SetToolPermissionDto[];
}
