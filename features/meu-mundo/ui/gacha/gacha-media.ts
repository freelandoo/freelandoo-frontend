// features/meu-mundo/ui/gacha/gacha-media.ts — gacha-v1 (24/11/2026): CONTRATO DA MÍDIA da abertura das Convocações.
//
// O Alex vai produzir os vídeos depois (roteiro em `MEU MUNDO 3D/planos/2026-11-24-convocacoes-video-roteiro.md`).
// Até lá TODOS os clipes são `null` e a abertura usa só a animação do jogo (gacha-reveal.tsx). Para ligar um
// vídeo: subir o arquivo em `public/meu-mundo/convocacao/v1/` (ou no R2) e preencher a linha aqui — nada da
// regra econômica muda.
//
// Regras do contrato:
//   • o vídeo NUNCA tem número, nome de item ou resultado: é a "abertura" genérica (ou a variante da FAIXA,
//     que só vale porque a faixa já veio do servidor). Fragmentos e quantidades são sempre o overlay traduzido;
//   • `revealAt` = segundo do clipe em que o jogo abre as cartas por cima;
//   • falhou (arquivo ausente, formato, autoplay bloqueado, demora > `timeoutMs`) = cai na animação, com o MESMO
//     resultado salvo. Pular a qualquer momento leva ao resumo.
import type { GachaBanner, GachaTier } from "../../data"

export interface GachaClip {
  /** Desktop (16:9) e celular (9:16). WebM VP9 primeiro; MP4 H.264 de reserva. */
  src: { wide: { webm?: string; mp4?: string }; tall?: { webm?: string; mp4?: string } }
  /** Segundo em que o jogo mostra as cartas por cima. */
  revealAt: number
  /** Duração total (s); passou disso sem `ended`, o jogo segue sozinho. */
  duration: number
  /** Cartaz enquanto carrega (opcional). */
  poster?: string
}

/** Abertura por banner e por faixa do MELHOR resultado (a faixa já é do servidor). null = animação do jogo. */
export const GACHA_MEDIA: Record<GachaBanner, Partial<Record<GachaTier, GachaClip | null>>> = {
  weapons: { common: null, rare: null, epic: null, top: null },
  protections: { common: null, rare: null, epic: null, top: null },
  characters: { common: null, rare: null, epic: null, top: null },
}

/** Quanto esperar o vídeo começar antes de cair na animação. */
export const GACHA_MEDIA_TIMEOUT_MS = 2500

export function clipFor(banner: GachaBanner, best: GachaTier): GachaClip | null {
  return GACHA_MEDIA[banner]?.[best] ?? null
}

/** Escolhe a fonte pela proporção da tela (tall no celular em pé, se existir). */
export function sourceOf(clip: GachaClip, tall: boolean): { webm?: string; mp4?: string } {
  return (tall && clip.src.tall) || clip.src.wide
}
