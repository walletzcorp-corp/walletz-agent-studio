import type { NextFunction, Request, Response } from 'express';
import { hostnameOf, isLocalHost, isSwaggerEnabled, localhostOnly } from '../swagger';

function run(path: string, host: string | undefined) {
  const req = { path, headers: { host } } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn() as NextFunction;
  localhostOnly(req, res as unknown as Response, next);
  return { res, next };
}

describe('Swagger — só em ambiente local', () => {
  it('fica desligado em produção e homologação', () => {
    expect(isSwaggerEnabled('production')).toBe(false);
    expect(isSwaggerEnabled('PRODUCTION')).toBe(false);
    expect(isSwaggerEnabled('staging')).toBe(false);
  });

  it('fica ligado em desenvolvimento e testes', () => {
    expect(isSwaggerEnabled('development')).toBe(true);
    expect(isSwaggerEnabled('test')).toBe(true);
    expect(isSwaggerEnabled(undefined)).toBe(true);
  });

  it('reconhece os hosts locais com ou sem porta', () => {
    expect(hostnameOf('localhost:3001')).toBe('localhost');
    expect(hostnameOf('[::1]:3001')).toBe('[::1]');
    expect(isLocalHost('127.0.0.1:3001')).toBe(true);
    expect(isLocalHost('LOCALHOST')).toBe(true);
    expect(isLocalHost('walletzcorp.com')).toBe(false);
    expect(isLocalHost('localhost.evil.com')).toBe(false);
    expect(isLocalHost(undefined)).toBe(false);
  });

  it('libera a documentação para localhost', () => {
    for (const path of ['/api/docs', '/api/docs/', '/api/docs/swagger-ui.css', '/api/docs-json', '/api/docs-yaml']) {
      const { next, res } = run(path, 'localhost:3001');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('esconde a documentação (404) para qualquer outro host, mesmo vindo do proxy local', () => {
    for (const path of ['/api/docs', '/api/docs/', '/api/docs-json', '/api/docs-yaml']) {
      const { next, res } = run(path, 'walletzcorp.com');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    }
  });

  it('não interfere nas demais rotas da API', () => {
    const { next } = run('/api/v1/health', 'walletzcorp.com');
    expect(next).toHaveBeenCalled();
  });
});
