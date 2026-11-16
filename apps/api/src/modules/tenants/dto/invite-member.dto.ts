import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Papéis que o dono/admin pode atribuir. "owner" nunca é atribuído por aqui. */
export const ASSIGNABLE_ROLES = ['admin', 'manager', 'agent_operator', 'analyst', 'viewer'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * Novo usuário da organização. O cadastro é fechado e cada organização é
 * isolada: o login é sempre novo e pertence só a esta organização.
 */
export class AddMemberDto {
  @ApiProperty({ example: 'colaborador@empresa.com.br' })
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

  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES, { message: 'Papel inválido' })
  role!: AssignableRole;

  @ApiProperty({ minLength: 8, description: 'Senha inicial; o usuário pode trocar depois' })
  @IsString()
  @Length(8, 100, { message: 'A senha precisa ter entre 8 e 100 caracteres' })
  password!: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES, { message: 'Papel inválido' })
  role!: AssignableRole;
}
