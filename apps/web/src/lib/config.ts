// A API expõe as rotas em /api/v1/* (global prefix "api" + versionamento URI).
const DEFAULT_API_URL = 'http://localhost:3001/api';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');
