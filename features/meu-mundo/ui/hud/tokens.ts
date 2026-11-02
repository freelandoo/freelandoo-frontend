// features/meu-mundo/ui/hud/tokens.ts — a linguagem visual do Meu Mundo (2026-10-25).
//
// mm3d-59 (reforma, 2026-11-02): "OBSERVATÓRIO DE ÉTER" — superfícies 100%
// OPACAS (o cenário nunca atravessa card/modal), ferro escuro, latão e dourado,
// cantos retos (chanfro nas peças do kit novo, ui/kit/), sombra dura. Os nomes
// abaixo ficaram (todo o jogo usa MM.x); "ruby*" agora é o BRONZE da ação
// principal. Tokens novos: ui/kit/aether-tokens.ts (AE).
//
// (Antes, 2026-10-25) Direção do Alex ("modernização da interface"): grafite translúcido, rubi nas
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
  surface: "#14171C",
  /** A gaveta lateral. */
  drawer: "#121519",
  /** Cards dentro dos painéis. */
  card: "#1D2229",
  /** Card pressionado/hover. */
  cardHover: "#262C35",
  border: "#6E5426",
  borderStrong: "#B8893B",
  text: "#F3EFE6",
  muted: "#A9A397",
  ruby: "#C98A45",
  rubyDark: "#5E3A16",
  /** Ação principal: rubi com gradiente sutil (estático). */
  rubyFill: "linear-gradient(180deg, #A8742E 0%, #6B4517 100%)",
  rubyBorder: "#F2B705",
  /** Card aceso (item ativo da gaveta, opção escolhida): rubi translúcido. */
  rubySoft: "linear-gradient(180deg, #3A2C12 0%, #251C0B 100%)",
  gold: "#F2B705",
  /** Borda dourada discreta (botão secundário). */
  goldBorder: "#8C6A2E",
  online: "#38E881",
  /** Desabilitado: cor apagada (nunca `opacity` na peça inteira). */
  disabledText: "rgba(184, 190, 200, 0.5)",
  danger: "#FF5A6E",
  /** Escurecimento atrás de gaveta/modais: o mundo continua identificável. */
  scrim: "rgba(6, 8, 12, 0.38)",
  shadow: "4px 4px 0 #000",
  shadowSoft: "2px 2px 0 #000",
  radius: { card: 0, panel: 0, button: 0, chip: 999 },
  /** Durações (ms): feedback de toque e entrada de painel. */
  dur: { press: 140, panel: 220 },
  /** Saída suave das entradas (gaveta, modal, aviso). */
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const
