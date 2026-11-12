import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const TENANT_STATUSES = ['trial', 'active', 'suspended', 'cancelled'] as const;
export type TenantStatusFilter = (typeof TENANT_STATUSES)[number];

export class ListTenantsQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome, slug ou e-mail do dono' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: TENANT_STATUSES })
  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: TenantStatusFilter;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ListActivityQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por tenant' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Prefixo da ação, ex.: "auth." ou "admin.tenant"' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class ListAgentsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Tipo de agente (template)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  template?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class SuspendTenantDto {
  @ApiProperty({ description: 'Motivo (fica no log de auditoria)', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ExtendTrialDto {
  @ApiProperty({ minimum: 1, maximum: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days!: number;
}

export class SetTokenLimitDto {
  @ApiProperty({
    nullable: true,
    description: 'Limite mensal de tokens (entrada + saída). null remove o limite.',
    minimum: 0,
    maximum: 2_000_000_000,
  })
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  limit!: number | null;
}
