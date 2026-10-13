/**
 * TELA CHEIA + HORIZONTAL, para o jogo (EVO Brazil, `/monsters`).
 *
 * O navegador só concede as duas coisas DENTRO DE UM GESTO da pessoa (um
 * toque/clique) — nunca sozinho no carregamento — e a trava de orientação só
 * vale depois que a tela cheia entrou. Por isso a ordem: tela cheia primeiro,
 * trava depois.
 *
 * QUEM CHAMA É O GESTO QUE JÁ EXISTE: o botão "Jogo" do perfil. A navegação até
 * `/monsters` é do roteador do Next (mesmo documento, sem recarregar), então a
 * tela cheia pedida no clique sobrevive à troca de página e o jogo já abre
 * deitado — sem a "porta" pedindo um segundo toque.
 *
 * iPhone: o Safari não tem tela cheia em página nem trava de orientação. As
 * duas tentativas falham em silêncio e a página `/monsters` mostra a porta com
 * o pedido escrito, como sempre.
 */

type ComTelaCheia = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
type ComTrava = ScreenOrientation & {
  lock?: (o: string) => Promise<void>
  unlock?: () => void
}

/** Só aparelho de dedo: no computador, tela cheia sem pedir seria invasivo. */
export function ehAparelhoDeToque(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
}

export async function deitaEmTelaCheia(): Promise<void> {
  const alvo = document.documentElement as ComTelaCheia
  try {
    if (!document.fullscreenElement) {
      await (alvo.requestFullscreen?.() ?? alvo.webkitRequestFullscreen?.())
    }
  } catch {
    /* o iOS não tem tela cheia em página */
  }
  try {
    await (screen.orientation as ComTrava).lock?.("landscape")
  } catch {
    /* iOS não trava orientação; a pessoa gira na mão */
  }
}

/** Já está deitado em tela cheia? (chegou pelo botão "Jogo") */
export function jaDeitado(): boolean {
  return !!document.fullscreenElement &&
    window.matchMedia("(orientation: landscape)").matches
}

/** Devolve o site ao normal ao sair do jogo — senão a Freelandoo inteira
 *  ficaria presa deitada e em tela cheia. */
export function solta(): void {
  try {
    ;(screen.orientation as ComTrava).unlock?.()
  } catch {
    /* sem trava, nada a soltar */
  }
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {})
  }
}
