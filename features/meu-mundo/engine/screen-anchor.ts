// features/meu-mundo/engine/screen-anchor.ts — onde o MEU personagem está na tela (mm3d-60).
//
// A cena aberta (rua/centro ou casa) registra uma função que projeta a cabeça
// do jogador local para coordenadas da janela; os efeitos da interface (números
// flutuantes, placas de drop) leem SÓ enquanto estão vivos — nada roda por
// quadro quando não há efeito. Puramente local: nada disso vai pela rede.

export type ScreenAnchor = () => { x: number; y: number } | null

let current: ScreenAnchor | null = null

/** Registra a âncora da cena; devolve quem desfaz (chamar no dispose). */
export function setScreenAnchor(fn: ScreenAnchor): () => void {
  current = fn
  return () => {
    if (current === fn) current = null
  }
}

/** Cabeça do jogador na janela (px), ou null (sem cena, atrás da câmera). */
export function screenAnchor(): { x: number; y: number } | null {
  try {
    return current?.() ?? null
  } catch {
    return null
  }
}
