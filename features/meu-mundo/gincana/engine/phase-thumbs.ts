// features/meu-mundo/gincana/engine/phase-thumbs.ts — miniatura 16:9 de cada fase da Gincana
// (18/11, geradas no ChatGPT: MEU MUNDO 3D/arte/minijogos-thumb). Arquivo à parte de
// phase-themes.ts para não misturar com as regras/visual da fase. Fase sem arquivo cai no degradê.
const THUMBS = "/meu-mundo/gincana/fases/"

export function gincanaThumb(id: string): string {
  return `${THUMBS}${id}.webp`
}
