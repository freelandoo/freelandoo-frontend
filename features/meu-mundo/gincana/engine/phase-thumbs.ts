// features/meu-mundo/gincana/engine/phase-thumbs.ts — miniatura 16:9 de cada fase da Gincana
// (20/11: geradas no ChatGPT A PARTIR DO PRINT de cada fase no harness — `shots-thumb.js` → print/atual-gincana-*.png
// + a referência de estilo; recorte 16:9 por tools/gincana-publicar.py em MEU MUNDO 3D/arte/minijogos-thumb). Arquivo à parte de
// phase-themes.ts para não misturar com as regras/visual da fase. Fase sem arquivo cai no degradê.
const THUMBS = "/meu-mundo/gincana/fases/"

export function gincanaThumb(id: string): string {
  return `${THUMBS}${id}.webp`
}
