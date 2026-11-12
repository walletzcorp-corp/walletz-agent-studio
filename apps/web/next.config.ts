import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Imagem Docker enxuta (server.js + só as deps rastreadas); a raiz do
  // monorepo é necessária para incluir packages/* no trace.
  output: 'standalone',
  // Produção: servido em https://walletzcorp.com/agent-studio (vazio em dev).
  // Lido no build; links fora de <Link>/router usam src/lib/paths.ts.
  ...(process.env.NEXT_PUBLIC_BASE_PATH ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH } : {}),
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Raiz → dashboard (o layout do dashboard manda quem não está logado para o login).
  // Feito aqui e não com redirect() numa page: no Next 15.0 isso aparece como
  // erro "NEXT_REDIRECT" no overlay de dev. O basePath é aplicado automaticamente.
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: false },
      // Telas antigas de cadastro: o cadastro é fechado (contato pelo WhatsApp).
      { source: '/register', destination: '/auth/register', permanent: false },
      { source: '/cadastro', destination: '/auth/register', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
