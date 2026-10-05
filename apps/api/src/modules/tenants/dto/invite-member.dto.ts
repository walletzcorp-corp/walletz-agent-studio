import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

type MembershipRole = 'admin' | 'manager' | 'agent_operator' | 'analyst' | 'viewer';

export class InviteMemberDto {
  @ApiProperty({ example: 'user@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['admin', 'manager', 'agent_operator', 'analyst', 'viewer'] })
  @IsEnum(['admin', 'manager', 'agent_operator', 'analyst', 'viewer'])
  role!: MembershipRole;
}
