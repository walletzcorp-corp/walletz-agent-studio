import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { GUARDS_METADATA, PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../roles.decorator';
import { RbacGuard } from '../rbac.guard';
import { REQUIRED_FEATURE_KEY } from '../../plans/requires-feature.decorator';

/**
 * Trava de regressão: toda rota de organização (`tenants/:tenantId/...`) passa pelo
 * RbacGuard e declara o papel mínimo. Rota nova sem @Roles quebra este teste
 * (e, em produção, o guard nega por padrão).
 */
type Ctor = new (...args: never[]) => unknown;

// Só os metadados dos controllers importam aqui; filas e parsers ESM não são carregados.
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => () => undefined,
  WorkerHost: class {},
  BullModule: { registerQueue: () => ({}), forRootAsync: () => ({}) },
}));
jest.mock('pdf-parse', () => ({}));
jest.mock('@nestjs/axios', () => ({ HttpService: class {}, HttpModule: { register: () => ({}) } }));

function controllerFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : controllerFiles(full);
    return e.name.endsWith('.controller.ts') ? [full] : [];
  });
}

function controllers(): Ctor[] {
  const root = path.resolve(__dirname, '../../../modules');
  return controllerFiles(root).flatMap((file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file) as Record<string, unknown>;
    return Object.values(mod).filter(
      (v): v is Ctor => typeof v === 'function' && Reflect.getMetadata(PATH_METADATA, v) !== undefined,
    );
  });
}

interface RouteInfo {
  route: string;
  hasRbac: boolean;
  roles: string[] | undefined;
  feature: string | undefined;
}

function routes(): RouteInfo[] {
  return controllers().flatMap((ctrl) => {
    const base = String(Reflect.getMetadata(PATH_METADATA, ctrl) ?? '');
    const classGuards = (Reflect.getMetadata(GUARDS_METADATA, ctrl) as unknown[] | undefined) ?? [];
    const proto = ctrl.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(proto)
      .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
      .filter((name) => Reflect.getMetadata(METHOD_METADATA, proto[name] as object) !== undefined)
      .map((name) => {
        const handler = proto[name] as object;
        const sub = String(Reflect.getMetadata(PATH_METADATA, handler) ?? '');
        const guards = [...classGuards, ...((Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[] | undefined) ?? [])];
        return {
          route: `${ctrl.name}.${name} → /${[base, sub].filter(Boolean).join('/')}`,
          hasRbac: guards.includes(RbacGuard),
          roles: (Reflect.getMetadata(ROLES_KEY, handler) ?? Reflect.getMetadata(ROLES_KEY, ctrl)) as string[] | undefined,
          feature: (Reflect.getMetadata(REQUIRED_FEATURE_KEY, handler) ?? Reflect.getMetadata(REQUIRED_FEATURE_KEY, ctrl)) as
            | string
            | undefined,
        };
      });
  });
}

describe('Rotas de organização', () => {
  const all = routes();
  // /admin/... usa o PlatformAdminGuard (admin da plataforma), não o vínculo com a organização.
  const tenantRoutes = all.filter((r) => r.route.includes(':tenantId') && !r.route.includes('→ /admin/'));

  it('encontra as rotas dos controllers', () => {
    expect(tenantRoutes.length).toBeGreaterThan(50);
  });

  it('todas passam pelo RbacGuard', () => {
    expect(tenantRoutes.filter((r) => !r.hasRbac).map((r) => r.route)).toEqual([]);
  });

  it('todas declaram o papel mínimo (@Roles)', () => {
    expect(tenantRoutes.filter((r) => !r.roles || r.roles.length === 0).map((r) => r.route)).toEqual([]);
  });

  it('rotas de recursos comerciais exigem o recurso do plano', () => {
    const expected: Array<[RegExp, string]> = [
      [/\/whatsapp\//, 'whatsapp'],
      [/\/calendars(\/|$)/, 'calendars'],
      [/\/webhooks(\/|$)/, 'outboundWebhooks'],
      [/\/webchat\//, 'webchat'],
      [/\/(campaigns|segments)(\/|$)/, 'campaigns'],
      [/\/pc-connector\//, 'pcConnector'],
    ];
    const missing = tenantRoutes.flatMap((r) =>
      expected.filter(([re, f]) => re.test(r.route) && r.feature !== f).map(([, f]) => `${r.route} (esperado ${f})`),
    );
    expect(missing).toEqual([]);
  });
});
