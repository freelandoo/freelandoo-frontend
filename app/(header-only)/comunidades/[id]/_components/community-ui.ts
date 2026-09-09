/**
 * O vocabulário visual que a página da comunidade DIVIDE com as telas filhas
 * dela (hoje o ranking cheio, em `[id]/ranking`).
 *
 * Mora aqui e não dentro do `page.tsx` porque a paleta é EDITÁVEL pelo líder e
 * é lida nas duas pontas: a página pinta o headcard com o accent escolhido e o
 * ranking pinta o pódio com o MESMO accent. Copiada, bastaria acrescentar uma
 * cor de um lado para as duas telas da mesma comunidade saírem em tons
 * diferentes — que é a divergência que o `academy-ui.ts` já existe para
 * impedir do lado da academia.
 *
 * Só o que as duas usam entra aqui. Tela nova de comunidade importa daqui em
 * vez de redeclarar.
 */

/**
 * A identidade da comunidade é a do Freelandoo (escuro/tabloide): o líder
 * recolore só os DETALHES (ícones, aba ativa, barra de progresso, botão de
 * entrar, destaques). A base — fundo, cards, texto — é fixa.
 */
export const ACCENTS: { key: string; labelKey: string; fallback: string; hex: string }[] = [
  { key: "gold", labelKey: "accentGold", fallback: "Dourado", hex: "#F2B705" },
  { key: "magenta", labelKey: "accentMagenta", fallback: "Magenta", hex: "#ff1f8e" },
  { key: "cyan", labelKey: "accentCyan", fallback: "Ciano", hex: "#16c8e8" },
  { key: "purple", labelKey: "accentPurple", fallback: "Roxo", hex: "#a06bff" },
  { key: "leaf", labelKey: "accentLeaf", fallback: "Verde folha", hex: "#4fc95a" },
  { key: "red", labelKey: "accentRed", fallback: "Vermelho", hex: "#ff5a44" },
  { key: "orange", labelKey: "accentOrange", fallback: "Laranja", hex: "#ff8c2e" },
  { key: "gray", labelKey: "accentGray", fallback: "Cinza", hex: "#b8b1a6" },
]

/** Chave desconhecida (ou ausente) cai no dourado, que é o padrão da casa. */
export function accentHex(a: string | null | undefined): string {
  return ACCENTS.find((x) => x.key === a)?.hex || ACCENTS[0].hex
}

/** 1.234 → "1.2k". Usado no XP dos membros nas duas telas. */
export function compact(n: number): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(Math.round(v))
}

/**
 * ESTA MODALIDADE DE COMUNIDADE PODE TER SITE?
 *
 * Decisão do Alex (2026-09-07): "só meus negócios tem site, o restante não tem,
 * nenhuma comunidade mais". O site é vitrine comercial — catálogo de serviços,
 * agendamento, depoimentos, contato —, e isso é pergunta da comunidade de
 * NEGÓCIO (a `common`, a que o pill "Business" do headcard abre). A comunidade
 * do cachorro, a do modelo de carro, a da rua, a do prédio e a plataforma de
 * games não vendem nada, e uma aba "Site" nelas era porta pintada: abria um
 * construtor para montar uma página que ninguém ia procurar.
 *
 * ⚠️ ESTE É O ESPELHO. Quem decide de verdade é o backend
 * (`kindHasSite` em `utils/communitySite.js`), que recusa ler, salvar,
 * publicar, renomear endereço e subir imagem fora da `common`. Espelhar aqui só
 * evita OFERECER o que ele recusaria — errar deste lado esconde um botão, nunca
 * abre uma porta.
 *
 * Modalidade nova que precise de site: mudar os DOIS lugares.
 */
export function kindHasSite(kind: string | null | undefined): boolean {
  // Ausente é comum: `community_kind` é NOT NULL com default 'common' desde a
  // mig 219, mas leitura que não traga o campo não pode sumir com o site que
  // já existe.
  return (kind || "common") === "common"
}

/**
 * "Esta pessoa pode CONSTRUIR o site desta comunidade?"
 *
 * É a régua da aba "Site" da página, do item "Meu Site" do menu "+" e do globo
 * amarelo do dock de negócios — as TRÊS portas do construtor. Ela mora aqui
 * porque duas delas vivem em telas diferentes da mesma comunidade (a página e o
 * ranking, que também carrega o dock): escrita em cada lugar, o dia em que a
 * regra mudasse deixaria uma das portas oferecendo o que a outra já fechou.
 *
 * As três metades: a modalidade tem site (`kindHasSite`), quem olha é o LÍDER
 * (o construtor recusa o resto — nem vice, nem admin da comunidade: o site é a
 * cara pública dela) e a flag `comunidade_site` está ligada (kill-switch de
 * CONSTRUÇÃO; o site publicado continua no ar com ela desligada).
 */
export function canBuildCommunitySite(opts: {
  kind: string | null | undefined
  isLeader: boolean
  siteEnabled: boolean
}): boolean {
  return kindHasSite(opts.kind) && opts.isLeader && opts.siteEnabled
}

/* ============================================================================
   A PELE DA PLATAFORMA DE NEGÓCIO (`.fl-business`) — cor de FUNDO editável
   ----------------------------------------------------------------------------
   Pedido do Alex (2026-09-09): "adapte essa página do meu negócio como as
   páginas games e financeiro, com WebGPU (...) preto, mas eu queria poder mudar
   a cor do fundo também — hoje só dá pra mudar a cor dos detalhes".

   ⚠️ POR QUE NÃO UM TERCEIRO SKIN FIXO, COMO `.fl-games` E `.fl-finance`.
   Aqueles dois pintam UM ambiente cada: o roxo é do games, o verde é do
   Financeiro, e por isso podem ser 40 linhas de valores escritos à mão. Aqui a
   cor é ESCOLHIDA por cada líder — um skin por cor seria a mesma lista copiada
   oito vezes, e a nona cor pediria a nona cópia. Então a lista de classes
   continua sendo UMA (a mesma dos outros dois ambientes, o que mantém a regra
   de "cor de superfície nova entra em todas as listas"), só que apontando para
   VARIÁVEIS que a página escreve no container.

   ⚠️ E POR QUE A RAMPA É DERIVADA, E NÃO DIGITADA POR COR. Cada preset diz
   duas coisas — o `canvas` (o fundo profundo) e o `glow` (a cor que acende
   painel, linha e névoa). O resto (painel, interior, tinta, apagado, borda)
   sai de mistura, aqui, num lugar só: digitados, os sete valores de cada uma
   das oito cores seriam 56 números para alguém manter em sincronia, e o dia em
   que a régua mudasse ela mudaria em uma cor só.

   As proporções abaixo não foram inventadas: foram calibradas contra as duas
   peles escritas à mão. Alimentando a função com o par (canvas, glow) do games
   e do Financeiro, a rampa de superfícies (painel, interior, fundo, linha) e a
   tinta saem a poucos pontos das cores que estão lá no CSS; só o apagado e a
   borda ficam na mesma família em vez de idênticos, porque aqueles dois foram
   escolhidos a olho e não são mistura pura de nada.
   ============================================================================ */

/** O par que define um ambiente: o fundo profundo e a cor que o acende. */
export const BACKDROPS: {
  key: string
  labelKey: string
  fallback: string
  canvas: string
  glow: string
}[] = [
  // O padrão pedido. Cinza-aço no lugar de um cinza puro: névoa e linhas
  // cinza-neutras sobre preto leem como fumaça, e o aço as mantém vivas.
  { key: "black", labelKey: "bgBlack", fallback: "Preto", canvas: "#08090B", glow: "#8E97A5" },
  { key: "navy", labelKey: "bgNavy", fallback: "Azul-noite", canvas: "#060B18", glow: "#3B82F6" },
  { key: "cyan", labelKey: "bgCyan", fallback: "Ciano", canvas: "#04121A", glow: "#22D3EE" },
  { key: "green", labelKey: "bgGreen", fallback: "Verde", canvas: "#05140F", glow: "#16B79A" },
  { key: "purple", labelKey: "bgPurple", fallback: "Roxo", canvas: "#0A0616", glow: "#8B5CF6" },
  { key: "wine", labelKey: "bgWine", fallback: "Vinho", canvas: "#14060B", glow: "#F43F5E" },
  { key: "amber", labelKey: "bgAmber", fallback: "Âmbar", canvas: "#140C02", glow: "#F2B705" },
  // O de hoje: quem não quiser plataforma nenhuma volta ao marrom tabloide.
  { key: "brown", labelKey: "bgBrown", fallback: "Marrom", canvas: "#0B0804", glow: "#B08948" },
]

/** Chave desconhecida (ou ausente) cai no PRETO, que é o padrão pedido. */
export function backdropTint(key: string | null | undefined): { canvas: string; glow: string } {
  const b = BACKDROPS.find((x) => x.key === key) || BACKDROPS[0]
  return { canvas: b.canvas, glow: b.glow }
}

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "")
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  return [
    parseInt(s.slice(0, 2), 16) || 0,
    parseInt(s.slice(2, 4), 16) || 0,
    parseInt(s.slice(4, 6), 16) || 0,
  ]
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const triple = (c: Rgb) => `${c[0]}, ${c[1]}, ${c[2]}`
const toHex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`

/**
 * As variáveis que a pele `.fl-business` lê. Vão no `style` do container da
 * página — é o único jeito de uma classe de CSS estático servir uma cor que só
 * existe no banco.
 *
 * ⚠️ SÃO TRIPLAS `r, g, b` e não cores prontas: o skin precisa da MESMA cor em
 * várias opacidades (o painel a 0.78, a 0.6, a 0.4…), e uma variável por
 * opacidade seria trinta variáveis em vez de dez. `color-mix()` resolveria isso
 * no CSS, mas num navegador que não o conhece a cor vira inválida e o bloco
 * fica transparente — a pele tem que DEGRADAR, nunca quebrar.
 */
export function platformSkinVars(bgKey: string | null | undefined): Record<string, string> {
  const { canvas, glow } = backdropTint(bgKey)
  const C = hexToRgb(canvas)
  const G = hexToRgb(glow)
  const W: Rgb = [255, 255, 255]
  return {
    "--fl-skin-canvas": canvas,
    "--fl-skin-canvas-rgb": triple(C),
    "--fl-skin-soft-rgb": triple(mixRgb(C, G, 0.04)),
    "--fl-skin-panel-rgb": triple(mixRgb(C, G, 0.12)),
    "--fl-skin-inner-rgb": triple(mixRgb(C, G, 0.2)),
    "--fl-skin-deep-rgb": triple(mixRgb(C, G, 0.31)),
    "--fl-skin-line": toHex(mixRgb(C, G, 0.36)),
    "--fl-skin-ink-rgb": triple(mixRgb(W, G, 0.15)),
    "--fl-skin-muted-rgb": triple(mixRgb(G, W, 0.24)),
    "--fl-skin-edge-rgb": triple(mixRgb(G, W, 0.16)),
    "--fl-skin-glow": glow,
    "--fl-skin-glow-rgb": triple(G),
  }
}
