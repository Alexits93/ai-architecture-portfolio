import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { generateOgImage } from '@/lib/og-image';
import type { BlogPost } from '@/lib/posts';

interface Props {
  post: BlogPost;
}

// One image per post at /blog/<slug>/og.png, next to the post page (#305).
export const getStaticPaths = (async () =>
  (await getCollection('blog')).map((post) => ({ params: { slug: post.id }, props: { post } }))) satisfies GetStaticPaths;

export const GET = (async ({ props }: { props: Props }) => {
  const pngBuffer = await generateOgImage(props.post.data.title, props.post.data.subtitle);
  return new Response(new Uint8Array(pngBuffer));
}) satisfies APIRoute<Props>;
