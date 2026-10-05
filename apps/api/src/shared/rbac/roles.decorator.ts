import { SetMetadata } from '@nestjs/common';

export type MembershipRole = 'owner' | 'admin' | 'manager' | 'agent_operator' | 'analyst' | 'viewer';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
