import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StrictBoolean } from '../../../shared/validation/strict-boolean.decorator';

export class SetToolPermissionDto {
  @ApiProperty({ example: 'schedule_appointment' })
  @IsString()
  toolName!: string;

  @ApiProperty({ example: true })
  @StrictBoolean()
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
