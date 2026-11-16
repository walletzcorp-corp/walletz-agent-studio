import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'access.public';
export const AUTHENTICATED_ROUTE_KEY = 'access.authenticated';

/**
 * No Walletz JWT required. The reason must name the mechanism that protects the route
 * (webhook signature, device secret, signed OAuth state, credentials in the body...).
 */
export const Public = (reason: string) => SetMetadata(PUBLIC_ROUTE_KEY, reason);

/** Any valid session, not bound to a tenant (profile, create tenant, list own tenants). */
export const Authenticated = () => SetMetadata(AUTHENTICATED_ROUTE_KEY, true);

// Tenant-scoped routes are declared with @Roles(...) (see roles.decorator.ts).
