// Genera los íconos de la PWA y los recursos de marca a partir del logo original
// (scripts/logo-source.png y scripts/wordmark-source.png) usando Chromium (Playwright).
// Uso: npm run icons      (requiere `npm i -D playwright` o Playwright global)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = async (f) => `data:image/png;base64,${(await readFile(path.join(root, 'scripts', f))).toString('base64')}`;
const logo = await src('logo-source.png'); // 1254x1254
const wordmark = await src('wordmark-source.png'); // 2172x724

// Recortes sobre las imágenes originales [x, y, ancho, alto]
const LOGO_TILE = [62, 62, 1130, 1130]; // el cuadrado redondeado completo
const LOGO_MARK = [365, 200, 540, 640]; // solo la "B" con el calendario
const WORDMARK = [160, 170, 1870, 360]; // la palabra "Bookora"

// [salida, imagen, recorte, ancho, alto, escala del contenido, fondo]
const targets = [
  ['public/icons/icon-192.png', logo, LOGO_TILE, 192, 192, 1, '#000'],
  ['public/icons/icon-512.png', logo, LOGO_TILE, 512, 512, 1, '#000'],
  ['public/icons/apple-touch-icon.png', logo, LOGO_TILE, 180, 180, 1, '#000'],
  // maskable: Android recorta en círculo/forma; contenido dentro de la zona segura (~60%)
  ['public/icons/maskable-512.png', logo, LOGO_MARK, 512, 512, 0.6, '#000'],
  ['public/brand/mark.png', logo, LOGO_MARK, 270, 320, 1, 'transparent'],
  ['public/brand/wordmark.png', wordmark, WORDMARK, 935, 180, 1, 'transparent'],
];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
for (const [out, img, [sx, sy, sw, sh], w, h, scale, bg] of targets) {
  const dataUrl = await page.evaluate(
    async ({ img, sx, sy, sw, sh, w, h, scale, bg }) => {
      const im = new Image();
      im.src = img;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (bg !== 'transparent') {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }
      // Encaja el recorte manteniendo proporción y centrado
      const fit = Math.min(w / sw, h / sh) * scale;
      const dw = sw * fit;
      const dh = sh * fit;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
      // Niveles: lleva a negro puro los grises muy oscuros (sombras del fondo del
      // logo original) para que no se note el recorte.
      const BLACK = 34;
      const lv = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < lv.data.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          lv.data[i + k] = Math.max(0, Math.round(((lv.data[i + k] - BLACK) * 255) / (255 - BLACK)));
        }
      }
      ctx.putImageData(lv, 0, 0);
      if (bg === 'transparent') {
        // Fondo negro del original -> transparente (luminancia como alfa)
        const d = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < d.data.length; i += 4) {
          const [r, g, b] = [d.data[i], d.data[i + 1], d.data[i + 2]];
          const a = Math.max(r, g, b);
          if (a > 0) {
            d.data[i] = Math.min(255, (r * 255) / a);
            d.data[i + 1] = Math.min(255, (g * 255) / a);
            d.data[i + 2] = Math.min(255, (b * 255) / a);
          }
          d.data[i + 3] = a;
        }
        ctx.putImageData(d, 0, 0);
      }
      return c.toDataURL('image/png');
    },
    { img, sx, sy, sw, sh, w, h, scale, bg },
  );
  await writeFile(path.join(root, out), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('✓', out);
}
await browser.close();
