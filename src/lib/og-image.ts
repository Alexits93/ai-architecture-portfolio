import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { html } from "satori-html";
import { OG_IMAGE_SIZE } from "@/consts";

const loadFont = (filename: string): Buffer =>
  fs.readFileSync(path.join(process.cwd(), "src/assets/fonts", filename));

// The logo draws in currentColor, which an <img> renders black, so the image sets it to the text colour.
const logoDataUri = (): string => {
  const svg = fs
    .readFileSync(path.join(process.cwd(), "src/assets/logo.svg"), "utf-8")
    .replaceAll("currentColor", "#ffffff");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

// The logo at the foot of every image says whose site the link leads to; a byline names the person beside it.
const generateMarkup = (
  title: string,
  description: string,
  byline = "",
) => html`
  <div
    style="display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box; background-color: #111111; color: white; padding: 60px; font-family: 'Inter', sans-serif;"
  >
    <div
      style="display: flex; flex-direction: column; justify-content: center; flex-grow: 1;"
    >
      <h1
        style="font-size: 64px; font-weight: 700; margin-bottom: 20px; line-height: 1.1;"
      >
        ${title}
      </h1>
      <p
        style="font-size: 32px; font-weight: 400; color: #a1a1aa; line-height: 1.5;"
      >
        ${description}
      </p>
    </div>
    <div style="display: flex; align-items: center; gap: 24px;">
      <img src="${logoDataUri()}" width="76" height="48" />
      <span style="font-size: 28px; font-weight: 400; color: #a1a1aa;">
        ${byline}
      </span>
    </div>
  </div>
`;

export async function renderOgSvg(
  title: string,
  description: string,
  byline?: string,
): Promise<string> {
  const fontRegular = loadFont("Inter-Regular.woff2");
  const fontBold = loadFont("Inter-Bold.woff2");
  const markup = generateMarkup(title, description, byline);

  return satori(markup, {
    ...OG_IMAGE_SIZE,
    fonts: [
      { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
      { name: "Inter", data: fontBold, weight: 700, style: "normal" },
    ],
  });
}

export async function generateOgImage(
  title: string,
  description: string,
  byline?: string,
): Promise<Buffer> {
  const svg = await renderOgSvg(title, description, byline);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_IMAGE_SIZE.width },
  });
  return resvg.render().asPng();
}
