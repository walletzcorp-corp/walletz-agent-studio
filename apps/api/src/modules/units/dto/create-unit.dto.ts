import { IsString, IsOptional, IsEmail, IsUUID, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Código único dentro da organização' })
  @IsString()
  @Length(1, 20)
  code: string;

  @ApiProperty()
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 200)
  cidade: string;

  @ApiProperty({ example: 'MG', description: 'UF (2 letras)' })
  @IsString()
  @Length(2, 2)
  uf: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional({ example: '38400-000' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' })
  cep?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
