import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { isValidTaxId, type CustomerType } from '../../../shared/validation/tax-id';
import { PLAN_SLUGS, type PlanSlug } from '../../../shared/plans/plan-catalog';

@ValidatorConstraint({ name: 'taxIdMatchesType' })
class TaxIdMatchesType implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const type = (args.object as { type?: CustomerType }).type;
    return typeof value === 'string' && (type === 'pf' || type === 'pj') && isValidTaxId(type, value);
  }
  defaultMessage(args: ValidationArguments): string {
    return (args.object as { type?: CustomerType }).type === 'pj' ? 'CNPJ inválido' : 'CPF inválido';
  }
}

export const TENANT_STATUSES = ['trial', 'active', 'suspended', 'cancelled'] as const;
export type TenantStatusFilter = (typeof TENANT_STATUSES)[number];

export const CUSTOMER_TYPES = ['pf', 'pj'] as const;

export class ListTenantsQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome, slug, e-mail do dono ou CPF/CNPJ' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: TENANT_STATUSES })
  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: TenantStatusFilter;

  @ApiPropertyOptional({ enum: CUSTOMER_TYPES, description: 'pf = pessoa física, pj = pessoa jurídica' })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES)
  customerType?: CustomerType;

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

export class CreateUserDto {
  @ApiProperty({ example: 'cliente@empresa.com.br' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Maria' })
  @IsString()
  @Length(1, 100, { message: 'Informe o nome' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ minLength: 8, description: 'Senha inicial; o usuário pode trocar depois' })
  @IsString()
  @Length(8, 100, { message: 'A senha precisa ter entre 8 e 100 caracteres' })
  password!: string;

  @ApiPropertyOptional({
    enum: PLAN_SLUGS,
    description: 'Com plano: cria também a organização do usuário nesse plano (ele vira dono). Sem plano: ele cria a organização no 1º acesso.',
  })
  @IsOptional()
  @IsIn(PLAN_SLUGS, { message: 'Plano inválido' })
  plan?: PlanSlug;

  @ApiPropertyOptional({ example: 'Clínica São José', description: 'Nome da organização (padrão: nome do usuário). Só com plano.' })
  @IsOptional()
  @IsString()
  @Length(2, 120, { message: 'Nome da organização: 2 a 120 caracteres' })
  organizationName?: string;
}

/** Cadastro de cliente pelo admin: cria a organização + o login do responsável. */
export class CreateCustomerDto {
  @ApiProperty({ enum: CUSTOMER_TYPES, description: 'pf = pessoa física (CPF), pj = pessoa jurídica (CNPJ)' })
  @IsIn(CUSTOMER_TYPES, { message: 'Tipo deve ser pf ou pj' })
  type!: CustomerType;

  @ApiProperty({ example: 'Maria da Silva', description: 'PF: nome completo. PJ: nome da empresa' })
  @IsString()
  @Length(2, 120, { message: 'Informe o nome (2 a 120 caracteres)' })
  name!: string;

  @ApiProperty({ example: '529.982.247-25', description: 'CPF (PF) ou CNPJ (PJ), com ou sem pontuação' })
  @IsString()
  @MaxLength(20)
  @Validate(TaxIdMatchesType)
  taxId!: string;

  @ApiProperty({ example: 'maria@email.com', description: 'E-mail de login do responsável' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: '41999998888' })
  @IsOptional()
  @IsString()
  @Length(10, 20, { message: 'Telefone inválido' })
  phone?: string;

  @ApiPropertyOptional({ example: 'João Souza', description: 'PJ: nome do responsável. PF: ignorado (usa o nome do cliente)' })
  @ValidateIf((o: CreateCustomerDto) => o.type === 'pj')
  @IsString()
  @Length(2, 120, { message: 'Informe o nome do responsável' })
  contactName?: string;

  @ApiPropertyOptional({ minLength: 8, description: 'Senha inicial. Obrigatória quando o e-mail ainda não tem conta' })
  @IsOptional()
  @IsString()
  @Length(8, 100, { message: 'A senha precisa ter entre 8 e 100 caracteres' })
  password?: string;

  @ApiPropertyOptional({ enum: PLAN_SLUGS, default: 'starter', description: 'Plano comercial contratado' })
  @IsOptional()
  @IsIn(PLAN_SLUGS, { message: 'Plano inválido' })
  plan?: PlanSlug;
}

export class SetPlanDto {
  @ApiProperty({ enum: PLAN_SLUGS, description: 'Plano comercial v4.2 (nenhum inclui tokens de IA)' })
  @IsIn(PLAN_SLUGS, { message: 'Plano inválido' })
  plan!: PlanSlug;
}

export const OVERRIDABLE_FEATURES = [
  'webchat',
  'whatsapp',
  'calendars',
  'emailNotifications',
  'emailInbox',
  'outboundWebhooks',
  'publicApi',
  'crmConnectors',
  'whiteLabel',
  'campaigns',
  'pcConnector',
] as const;

export class SetFeatureOverrideDto {
  @ApiProperty({ enum: OVERRIDABLE_FEATURES })
  @IsIn(OVERRIDABLE_FEATURES)
  feature!: (typeof OVERRIDABLE_FEATURES)[number];

  @ApiProperty({
    nullable: true,
    description: 'true libera (sob medida), false bloqueia, null volta ao padrão do plano',
  })
  @ValidateIf((_o, v) => v !== null)
  @IsBoolean()
  enabled!: boolean | null;
}
