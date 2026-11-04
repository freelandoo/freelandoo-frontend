// features/meu-mundo/engine/screen-anchor.ts — onde o MEU personagem está na tela (mm3d-60).
//
// A cena aberta (rua/centro ou casa) registra uma função que projeta a cabeça
// do jogador local para coordenadas da janela; os efeitos da interface (números
// flutuantes, placas de drop) leem SÓ enquanto estão vivos — nada roda por
// quadro quando não há efeito. Puramente local: nada disso vai pela rede.

/** `y` = cabeça; `feet` = pés (2026-11-03: as notificações ficam logo abaixo dos pés). */
export type ScreenAnchor = () => { x: number; y: number; feet?: number } | null

/** Vale a última cena aberta; um prédio por cima da rua devolve a âncora ao fechar. */
const anchors: ScreenAnchor[] = []

/** Registra a âncora da cena; devolve quem desfaz (chamar no dispose). */
export function setScreenAnchor(fn: ScreenAnchor): () => void {
  anchors.push(fn)
  return () => {
    const i = anchors.indexOf(fn)
    if (i >= 0) anchors.splice(i, 1)
  }
}

/** Cabeça do jogador na janela (px), ou null (sem cena, atrás da câmera). */
export function screenAnchor(): { x: number; y: number; feet?: number } | null {
  try {
    return anchors[anchors.length - 1]?.() ?? null
  } catch {
    return null
  }
}
