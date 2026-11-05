import 'reflect-metadata';
import type { INestApplication, Type } from '@nestjs/common';
import { Reflector, ModulesContainer } from '@nestjs/core';
import { readRouteAccess, type RouteAccess } from '../../shared/rbac/access-policy.guard';
import type { MembershipRole } from '../../shared/rbac/roles.decorator';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD'] as const;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RouteInfo {
  method: HttpMethod;
  /** Full template, e.g. /api/v1/tenants/:tenantId/agents/:agentId */
  path: string;
  controller: string;
  handler: string;
  access: RouteAccess;
  /** Lowest role that satisfies the route (tenant routes only). */
  minRole?: MembershipRole;
  /** :params other than :tenantId (resource identifiers). */
  resourceParams: string[];
}

const ROLE_RANK: Record<MembershipRole, number> = {
  viewer: 0,
  analyst: 1,
  agent_operator: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

export const roleRank = (role: MembershipRole): number => ROLE_RANK[role];

function join(...parts: Array<string | undefined>): string {
  return (
    '/' +
    parts
      .filter((p): p is string => !!p)
      .flatMap((p) => p.split('/'))
      .filter(Boolean)
      .join('/')
  );
}

/** Reads every HTTP route straight from the live Nest container (no hand-maintained list). */
export function discoverRoutes(app: INestApplication): RouteInfo[] {
  const reflector = app.get(Reflector);
  const container = app.get(ModulesContainer);
  const routes: RouteInfo[] = [];

  for (const mod of container.values()) {
    for (const wrapper of mod.controllers.values()) {
      const cls = wrapper.metatype as Type<unknown> | null;
      if (!cls) continue;
      const controllerPath = Reflect.getMetadata('path', cls) as string | string[] | undefined;
      if (controllerPath === undefined) continue;
      const base = Array.isArray(controllerPath) ? controllerPath[0] : controllerPath;

      for (const name of Object.getOwnPropertyNames(cls.prototype)) {
        if (name === 'constructor') continue;
        const handler = cls.prototype[name] as (...args: unknown[]) => unknown;
        if (typeof handler !== 'function') continue;
        const methodIndex = Reflect.getMetadata('method', handler) as number | undefined;
        const methodPath = Reflect.getMetadata('path', handler) as string | string[] | undefined;
        if (methodIndex === undefined || methodPath === undefined) continue;
        const method = METHODS[methodIndex];
        if (!method || method === 'ALL' || method === 'OPTIONS' || method === 'HEAD') continue;

        const sub = Array.isArray(methodPath) ? methodPath[0] : methodPath;
        const path = join('api', 'v1', base, sub);
        const access = readRouteAccess(reflector, [handler, cls]);
        const roles = access.kind === 'tenant' ? access.roles : [];
        const minRole = roles.length
          ? roles.reduce((a, b) => (ROLE_RANK[a] <= ROLE_RANK[b] ? a : b))
          : undefined;

        routes.push({
          method: method as HttpMethod,
          path,
          controller: cls.name,
          handler: name,
          access,
          minRole,
          resourceParams: [...path.matchAll(/:(\w+)/g)]
            .map((m) => m[1]!)
            .filter((p) => p !== 'tenantId' && p !== 'provider'),
        });
      }
    }
  }

  return routes.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
}
