/**
 * Caminhos do app. Em produção o web é servido em subpasta
 * (https://walletzcorp.com/agent-studio), definida em NEXT_PUBLIC_BASE_PATH
 * no build; em dev fica vazio.
 *
 * <Link>, router.push e redirect() já aplicam o basePath sozinhos. Use estes
 * helpers só fora deles: window.location, <a href>, metadata/manifest.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Caminho de página com o basePath. `path` começa com "/". */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Base da API; NEXT_PUBLIC_API_URL já inclui o sufixo /api. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** URL absoluta de um endpoint da API. `path` começa com "/v1/". */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
