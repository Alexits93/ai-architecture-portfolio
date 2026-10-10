import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { html } from 'satori-html';

const loadFont = (filename: string): Buffer => 
  fs.readFileSync(path.join(process.cwd(), 'src/shared/assets/fonts', filename));

const generateMarkup = (title: string, description: string) => html`
  <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background-color: #111111; color: white; padding: 60px; font-family: 'Inter', sans-serif;">
    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
      <h1 style="font-size: 64px; font-weight: 700; margin-bottom: 20px; line-height: 1.1;">${title}</h1>
      <p style="font-size: 32px; font-weight: 400; color: #a1a1aa; line-height: 1.5;">${description}</p>
    </div>
  </div>
`;

export async function renderOgSvg(title: string, description: string): Promise<string> {
  const fontRegular = loadFont('Inter-Regular.woff');
  const fontBold = loadFont('Inter-Bold.woff');
  const markup = generateMarkup(title, description);

  return satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
    ],
  });
}

export async function generateOgImage(title: string, description: string): Promise<Buffer> {
  const svg = await renderOgSvg(title, description);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}
