import { Injectable } from '@nestjs/common';
import type { MembershipRole } from './roles.decorator';

// Role hierarchy: higher index = more privileged
const ROLE_HIERARCHY: MembershipRole[] = [
  'viewer',
  'analyst',
  'agent_operator',
  'manager',
  'admin',
  'owner',
];

@Injectable()
export class PermissionsService {
  hasRole(userRole: MembershipRole, requiredRoles: MembershipRole[]): boolean {
    const userLevel = ROLE_HIERARCHY.indexOf(userRole);
    return requiredRoles.some((r) => {
      const requiredLevel = ROLE_HIERARCHY.indexOf(r);
      return userLevel >= requiredLevel;
    });
  }

  isAtLeast(userRole: MembershipRole, minimumRole: MembershipRole): boolean {
    return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
  }
}
