import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Walletz Agent Studio',
    short_name: 'Walletz',
    description: 'Crie, ensine, conecte e automatize agentes de inteligência artificial.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#070B14',
    theme_color: '#6D4AFF',
    icons: [
      { src: '/favicon.svg',    sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.svg',    sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  };
}
