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
