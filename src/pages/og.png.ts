import type { APIRoute } from 'astro';
import { SITE } from '@/shared/config';
import { generateOgImage } from '@/shared/lib/og/generate-og-image';

export const GET = (async () => {
  const pngBuffer = await generateOgImage(SITE.title, SITE.description);

  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}) satisfies APIRoute;
