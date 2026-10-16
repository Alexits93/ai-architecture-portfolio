import type { APIRoute } from "astro";
import { SITE } from "@/consts";
import { generateOgImage } from "@/lib/og-image";

// A static build writes only the body to dist/og.png; the host sets the headers.
export const GET = (async () =>
  new Response(
    new Uint8Array(await generateOgImage(SITE.title, SITE.description)),
  )) satisfies APIRoute;
