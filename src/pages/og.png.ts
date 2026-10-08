import type { APIRoute } from 'astro';
import { generateOgImage } from '@/shared/lib/og/generate-og-image';

export const GET: APIRoute = async () => {
  try {
    const title = 'Patrika | AI Architecture Portfolio';
    const description = 'Exploring AI Architecture, Modern Web Development, and the Future of Engineering.';
    const pngBuffer = await generateOgImage(title, description);

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Error generating OG image', { status: 500 });
  }
};
