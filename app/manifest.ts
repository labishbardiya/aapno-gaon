import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AAPNO GAON', short_name: 'AAPNO GAON', start_url: '/', scope: '/',
    display: 'standalone', background_color: '#f3f4ec', theme_color: '#245738',
    icons: [{ src: '/app-icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon-large.png', sizes: '512x512', type: 'image/png' }],
  };
}
