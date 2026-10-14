// Imágenes de muestra generadas como SVG (data URI): no dependen de internet
// ni de fotos con derechos. En una versión real serían fotos subidas por el barbero.

const PALETTES = [
  ['#2b2d33', '#0d0e10', '#c9ccd3'],
  ['#33302b', '#100e0c', '#d8cbb5'],
  ['#262c33', '#0b0e11', '#b9c8d8'],
  ['#2f2a33', '#0f0c11', '#cdbfdc'],
  ['#2a332e', '#0c110e', '#bdd8c8'],
  ['#332b2b', '#110c0c', '#dcbfbf'],
];

// Iconos de línea simples para cada tipo de trabajo
const MOTIFS = {
  tijera: '<circle cx="-18" cy="22" r="10"/><circle cx="18" cy="22" r="10"/><path d="M-11 15 L22 -28 M11 15 L-22 -28"/>',
  navaja: '<path d="M-30 10 L22 -16 Q32 -20 30 -10 L-22 16 Z"/><path d="M-30 10 L-40 22"/>',
  peine:
    '<rect x="-32" y="-12" width="64" height="12" rx="3"/><path d="M-26 0v18M-18 0v18M-10 0v18M-2 0v18M6 0v18M14 0v18M22 0v18"/>',
  maquina: '<rect x="-16" y="-30" width="32" height="56" rx="10"/><path d="M-16 -18 h32 M-10 30 v8 M10 30 v8"/>',
  barba: '<path d="M-26 -18 Q-28 26 0 32 Q28 26 26 -18"/><path d="M-12 6 Q0 0 12 6"/>',
  silla: '<path d="M-22 -10 h44 v18 h-44 z M-26 8 h52 M0 8 v20 M-16 28 h32 M-18 -10 v-20 h36 v20"/>',
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Portada del perfil del barbero (panorámica). */
export function coverArt(seed) {
  const h = hash(seed);
  const [c1, c2, ink] = PALETTES[h % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="10" height="28" fill="${ink}" opacity=".06"/></pattern></defs>
<rect width="400" height="220" fill="url(#g)"/><rect width="400" height="220" fill="url(#p)"/>
<g transform="translate(${300 - (h % 60)} 100) scale(2.4)" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".35">${MOTIFS.silla}</g>
<g transform="translate(${90 + (h % 40)} 70) scale(1.3) rotate(-20)" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".25">${MOTIFS.tijera}</g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Avatar con iniciales para personas sin foto. */
export function avatarArt(name) {
  const h = hash(name);
  const [c1, c2, ink] = PALETTES[h % PALETTES.length];
  // Nombre + apellido, ignorando apodos entre comillas: 'Carlos “El Maestro” Rivera' -> 'CR'
  const words = name
    .replace(/["“][^"”]*["”]/g, ' ')
    .split(/\s+/)
    .filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w));
  const initials = (words.length > 1 ? [words[0], words[words.length - 1]] : words).map((w) => w[0]).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#g)"/>
<text x="50" y="62" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="${ink}">${esc(initials)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
