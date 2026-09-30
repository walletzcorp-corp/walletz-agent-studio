import { IsString, IsOptional, IsEmail, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Clínica Saúde Ltda' })
  @IsString()
  @Length(2, 200)
  razaoSocial: string;

  @ApiProperty({ example: 'Clínica Saúde' })
  @IsString()
  @Length(2, 200)
  nomeFantasia: string;

  @ApiProperty({ example: '12.345.678/0001-90', description: 'CNPJ (com ou sem máscara)' })
  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, {
    message: 'CNPJ inválido',
  })
  cnpj: string;

  @ApiPropertyOptional({ example: 'contato@clinica.com.br' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '(34) 3333-4444' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: 'https://clinica.com.br' })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  locale?: string;
}
