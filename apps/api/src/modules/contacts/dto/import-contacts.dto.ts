import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StrictBoolean } from '../../../shared/validation/strict-boolean.decorator';

export const MAX_IMPORT_ROWS = 5000;

export class ImportContactItemDto {
  @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(200) email?: string;
  @IsOptional() @IsString() @MaxLength(80) origin?: string;
  @IsOptional() @IsString() @MaxLength(120) segment?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() @MaxLength(2000) observation?: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @StrictBoolean() hasWhatsappConsent?: boolean;
  @IsOptional() @IsString() @MaxLength(40) consentDate?: string;
  @IsOptional() @IsString() @MaxLength(120) consentOrigin?: string;
  @IsOptional() @IsObject() customFields?: Record<string, string>;
}

export class ImportContactsBodyDto {
  @ApiProperty({ type: [ImportContactItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportContactItemDto)
  contacts!: ImportContactItemDto[];
}
