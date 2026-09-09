/**
 * O FUNDO DAS PLATAFORMAS — uma TEXTURA ESTÁTICA na cor do ambiente.
 *
 * ⚠️ O NOME `tech-backdrop` É LEGADO. Ele vem da época em que este arquivo
 * desenhava uma nebulosa em WebGPU; o shader morreu (ver abaixo) e o caminho
 * ficou, pela mesma razão que a tabela de enxames ainda se chama `tb_machine`:
 * rename de arquivo é só de aplicação, e trocá-lo aqui quebraria todos os
 * ponteiros que a documentação do projeto já tem para ele.
 *
 * ─── POR QUE O WEBGPU SAIU (Alex, 2026-09-09) ───────────────────────────────
 *
 * "o games está muito pesado e travando (...) os pills estão travando, está
 * tudo travando. Então é melhor a gente retirar."
 *
 * ⚠️ E O SINTOMA ENGANAVA: quem travava não era o fundo, era A PÁGINA. Um
 * shader de tela cheia DIVIDE A GPU COM O COMPOSITOR DO NAVEGADOR — enquanto
 * ele desenha o papel de parede, a rolagem, o spring dos pills e a abertura
 * dos painéis ficam na fila esperando a mesma GPU. Por isso a causa parecia
 * estar em qualquer outro lugar (nos pills, no feed, no vídeo), e por isso
 * afinar o shader só adiava o problema: o custo é POR PIXEL, então quem paga
 * a conta é o TAMANHO DA JANELA, e num monitor grande ela nunca fecha.
 *
 * ⚠️ E NÃO ERA SÓ O CANVAS. O caminho de reserva em CSS animava
 * `background-position` numa camada `fixed` do tamanho da janela — isso é um
 * REPINTE DE TELA CHEIA a cada quadro, para sempre, e valia inclusive para
 * quem não tinha WebGPU nenhum. As duas coisas saíram juntas; ver a nota na
 * `.fl-games-bg`, em globals.css.
 *
 * O que fica é o que o Alex pediu: "deixar o fundo apenas como a textura, com
 * o tema da cor — games vai ser sempre roxo". Gradientes e uma grade fina, em
 * CSS, pintados UMA vez. Depois disso a camada é composta e rolar a página
 * custa zero aqui.
 *
 * ⚠️ NÃO RESSUSCITAR MOVIMENTO NESTE FUNDO — nem canvas, nem `animation`, nem
 * biblioteca de animação. Se um dia o ambiente precisar de vida, ela tem que
 * caber num elemento pequeno (um selo, um chip), nunca numa camada do tamanho
 * da janela.
 *
 * ─── TRÊS AMBIENTES, UMA PEÇA ────────────────────────────────────────────────
 *
 * `games` é roxo, `finance` é verde e `business` é a cor que o LÍDER escolheu
 * (por isso ela vem de fora, em `tint`, da MESMA função que pinta a pele
 * `.fl-business` da página: duas fontes de cor fariam o fundo e os painéis
 * discordarem). O que muda é a classe — o desenho mora todo em globals.css,
 * junto das peles, para que uma cor nova entre num lugar só.
 *
 * ⚠️ A CAMADA DE CIFRÕES DO FINANCEIRO continua sendo CSS por cima
 * (`.fl-money-veil`), e não parte do fundo: ela é o símbolo do ambiente, e o
 * fundo é a cor dele.
 */

export type BackdropVariant = "games" | "finance" | "business"

/** O desenho de cada ambiente. Ver globals.css. */
const BG_CLASS: Record<BackdropVariant, string> = {
  games: "fl-games-bg",
  finance: "fl-finance-bg",
  business: "fl-business-bg",
}

/**
 * Este componente é PURO: sem estado, sem efeito, sem hook — por isso ele não
 * precisa de `"use client"` e não custa nada na hidratação. É também por isso
 * que as páginas o importam DIRETO em vez de por `dynamic()`: um `dynamic` aqui
 * pediria um chunk à parte para entregar quatro divs, e o fundo só apareceria
 * depois que ele chegasse — a cor do ambiente piscando na entrada da tela.
 */
export function TechBackdrop({
  variant = "games",
  tint,
}: {
  variant?: BackdropVariant
  /** Só a variante `business` usa: o par (canvas, glow) escolhido pelo líder. */
  tint?: { canvas: string; glow: string }
}) {
  // A pele de negócio lê `--fl-skin-*` do container da página. Repetir as duas
  // que ESTE bloco usa no style local é barato e torna o fundo independente de
  // onde ele for montado — sem elas herdadas, ele nasceria transparente.
  const style =
    variant === "business" && tint
      ? ({
          "--fl-skin-canvas": tint.canvas,
          "--fl-skin-glow-rgb": rgbTriplet(tint.glow),
        } as React.CSSProperties)
      : undefined

  return (
    <div
      aria-hidden
      style={style}
      className={`${BG_CLASS[variant]} pointer-events-none fixed inset-0 select-none`}
    >
      {/* O SÍMBOLO DE DINHEIRO do ambiente financeiro (pedido do Alex: "no fundo
          algum símbolo de dinheiro"). Estático, como o resto. */}
      {variant === "finance" && <div className="fl-money-veil absolute inset-0" />}
    </div>
  )
}

/** "#16B79A" → "22, 183, 154" (o formato que `rgba(var(--x), a)` espera). */
function rgbTriplet(hex: string): string {
  const h = hex.replace("#", "")
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = (i: number) => parseInt(s.slice(i, i + 2), 16) || 0
  return `${n(0)}, ${n(2)}, ${n(4)}`
}
