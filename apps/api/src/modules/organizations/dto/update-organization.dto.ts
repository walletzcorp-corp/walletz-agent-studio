import { PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(OmitType(CreateOrganizationDto, ['cnpj'] as const)) {
  @ApiProperty({ description: 'Versão atual para controle de concorrência otimista' })
  @IsInt()
  @Min(0)
  rowVersion: number;
}
