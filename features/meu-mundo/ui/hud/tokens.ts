// features/meu-mundo/ui/hud/tokens.ts — a linguagem visual do Meu Mundo (2026-10-25).
//
// Direção do Alex ("modernização da interface"): grafite translúcido, rubi nas
// ações principais e estados ativos, dourado discreto em ícones/detalhes,
// verde para presença online, cantos arredondados, bordas finas, sombras
// curtas, gradientes estáticos. Exceção à regra de cantos retos do site: o
// jogo NÃO fica dentro de `.fl-sharp`.
//
// Transparência vai no FUNDO de cada peça (nunca `opacity` no componente
// inteiro, que apagaria texto e ícones) e nunca com backdrop-filter (custo no
// celular). Mudar o visual do jogo = mudar aqui.

export const MM = {
  /** Painéis grandes (notificação, modais, STATUS). */
  surface: "rgba(18, 22, 28, 0.84)",
  /** A gaveta lateral. */
  drawer: "rgba(15, 19, 25, 0.88)",
  /** Cards dentro dos painéis. */
  card: "rgba(30, 35, 43, 0.60)",
  /** Card pressionado/hover. */
  cardHover: "rgba(44, 50, 60, 0.70)",
  border: "rgba(255, 255, 255, 0.13)",
  borderStrong: "rgba(255, 255, 255, 0.22)",
  text: "#F4F5F7",
  muted: "#B8BEC8",
  ruby: "#AD1644",
  rubyDark: "#650D2A",
  /** Ação principal: rubi com gradiente sutil (estático). */
  rubyFill: "linear-gradient(180deg, #B81A4A 0%, #8A1238 100%)",
  rubyBorder: "rgba(255, 120, 160, 0.45)",
  /** Card aceso (item ativo da gaveta, opção escolhida): rubi translúcido. */
  rubySoft: "linear-gradient(180deg, rgba(128, 18, 56, 0.78) 0%, rgba(78, 10, 34, 0.78) 100%)",
  gold: "#E5BE70",
  /** Borda dourada discreta (botão secundário). */
  goldBorder: "rgba(229, 190, 112, 0.38)",
  online: "#38E881",
  /** Desabilitado: cor apagada (nunca `opacity` na peça inteira). */
  disabledText: "rgba(184, 190, 200, 0.5)",
  danger: "#FF5A6E",
  /** Escurecimento atrás de gaveta/modais: o mundo continua identificável. */
  scrim: "rgba(6, 8, 12, 0.38)",
  shadow: "0 4px 14px rgba(0, 0, 0, 0.28)",
  shadowSoft: "0 2px 8px rgba(0, 0, 0, 0.22)",
  radius: { card: 14, panel: 20, button: 14, chip: 999 },
  /** Durações (ms): feedback de toque e entrada de painel. */
  dur: { press: 140, panel: 220 },
  /** Saída suave das entradas (gaveta, modal, aviso). */
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const
