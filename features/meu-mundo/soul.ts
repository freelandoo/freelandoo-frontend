// features/meu-mundo/soul.ts — a "alma" do hóspede na tela (mm3d-72).
//
// A regra é do servidor (freelandoo-backend/src/utils/meuMundoSoul.js): aqui só
// os nomes e as frases. Pedido do Alex (2026-11-07): personalidade, quanto ele
// gosta do dono, o que mais gosta e mais odeia, e o apelido com que ele chama o
// dono. Desde 2026-11-15 a personalidade é SÓ VOZ (não mexe em luta, monstro,
// fome nem desejo) e são treze; as falas de cada uma estão em banter.ts.

export type Temper =
  | "psicopata"
  | "covarde"
  | "comilao"
  | "bondoso"
  | "competitivo"
  | "preguicoso"
  | "vaidoso"
  | "rabugento"
  | "palhaco"
  | "carente"
  | "paoduro"
  | "fofoqueiro"
  | "narcisista"
export type SoulAct = "training" | "studying" | "working" | "praying" | "sleeping" | "fight" | "minigame"
export type WishId = "fight" | "home_night" | "eat_more" | "fav_food" | "pray" | "rest" | "minigame"

export interface LifeSoul {
  temper: Temper
  /** 0 sem teto. */
  affection: number
  likes: { food: string; act: SoulAct }
  hates: { food: string; act: SoulAct }
  /** Apelido que o dono deu ao hóspede. */
  petName: string | null
  /** Como ele chama o dono agora (o servidor decide pelo afeto). */
  call: { kind: "nick" } | { kind: "like"; food: string } | { kind: "hate"; food: string }
  wish: { id: WishId; until: string } | null
  /** Apelido que o dono escolheu para si (tb_mm_player); null = ainda não escolheu. */
  nickname: string | null
  /** Quanto o afeto mudou nesta leitura. */
  felt?: number
}

/** A partir daqui ele chama o dono pelo que mais gosta (espelho de AFFECTION.NAME_AT). */
export const AFFECTION_NAME_AT = 200

type Tr = (key: string, fallback: string) => string

export const TEMPER_COLOR: Record<Temper, string> = {
  psicopata: "#FF2E4D",
  covarde: "#9FB4FF",
  comilao: "#FFB13B",
  bondoso: "#7CFFB2",
  competitivo: "#FFE45C",
  preguicoso: "#B8A98F",
  vaidoso: "#FF8AD8",
  rabugento: "#9C8C7A",
  palhaco: "#FF7A3D",
  carente: "#FF9EB5",
  paoduro: "#7FD36B",
  fofoqueiro: "#C08BFF",
  narcisista: "#FFD700",
}

export function temperLabel(x: Temper, t: Tr) {
  return {
    psicopata: t("soulPsycho", "Psicopata"),
    covarde: t("soulCoward", "Covarde"),
    comilao: t("soulGlutton", "Comilão"),
    bondoso: t("soulKind", "Bondoso"),
    competitivo: t("soulCompetitive", "Competitivo"),
    preguicoso: t("soulLazy", "Preguiçoso"),
    vaidoso: t("soulVain", "Vaidoso"),
    rabugento: t("soulGrumpy", "Rabugento"),
    palhaco: t("soulClown", "Palhaço"),
    carente: t("soulNeedy", "Carente"),
    paoduro: t("soulCheap", "Pão-duro"),
    fofoqueiro: t("soulGossip", "Fofoqueiro"),
    narcisista: t("soulNarcissist", "Narcisista"),
  }[x]
}

export function temperLine(x: Temper, t: Tr) {
  return {
    psicopata: t("soulPsychoLine", "Xinga, ameaça e acha graça quando dá errado para os outros. Humor ácido, sem filtro."),
    covarde: t("soulCowardLine", "Tem medo de tudo e narra o próprio pânico em tempo real."),
    comilao: t("soulGluttonLine", "Tudo no mundo vira comida na cabeça dele."),
    bondoso: t("soulKindLine", "Formal e gentil até com monstro. A ironia é a educação dele."),
    competitivo: t("soulCompetitiveLine", "Transforma tudo em placar, recorde e revanche."),
    preguicoso: t("soulLazyLine", "Reclama de tudo que dá trabalho e só pensa em sentar."),
    vaidoso: t("soulVainLine", "Só pensa no cabelo, na roupa e no próprio reflexo."),
    rabugento: t("soulGrumpyLine", "Reclama de tudo e de todos. No tempo dele era melhor."),
    palhaco: t("soulClownLine", "Faz piada de tudo, principalmente da própria desgraça."),
    carente: t("soulNeedyLine", "Quer a atenção e o carinho do treinador o tempo todo."),
    paoduro: t("soulCheapLine", "Sofre com cada moeda gasta e acha tudo caro."),
    fofoqueiro: t("soulGossipLine", "Sabe da vida de todo mundo e conta tudo."),
    narcisista: t("soulNarcissistLine", "Só fala de si mesmo e passa cantada em todo adulto que vê."),
  }[x]
}

/** Nome curto da comida (é também o apelido que ele usa: "Ei, Pizza!"). */
export function foodShort(id: string, t: Tr) {
  const m: Record<string, [string, string]> = {
    salmao_legumes: ["soulFoodSalmon", "Peixe defumado"],
    frango_salada: ["soulFoodChicken", "Frango"],
    prato_integral: ["soulFoodWholegrain", "Prato do ferreiro"],
    bowl_frutas: ["soulFoodFruit", "Frutinha"],
    omelete_legumes: ["soulFoodOmelette", "Omelete"],
    iogurte_aveia: ["soulFoodYogurt", "Mingau"],
    sopa_legumes: ["soulFoodSoup", "Sopinha"],
    prato_feito: ["soulFoodPF", "Prato da taverna"],
    hamburguer: ["soulFoodBurger", "Hambúrguer"],
    pizza: ["soulFoodPizza", "Pizza"],
    cachorro_quente: ["soulFoodHotdog", "Espeto"],
    coxinha: ["soulFoodCoxinha", "Bolinho"],
    chocolate: ["soulFoodChocolate", "Cacau"],
    miojo: ["soulFoodNoodles", "Miojo"],
    salgadinho: ["soulFoodChips", "Cascas fritas"],
    biscoito_recheado: ["soulFoodCookie", "Biscoito"],
    refrigerante: ["soulFoodSoda", "Sidra"],
    agua_coco: ["soulFoodCoconut", "Água da fonte"],
  }
  const e = m[id]
  return e ? t(e[0], e[1]) : id
}

export function actLabel(a: SoulAct, t: Tr) {
  return {
    training: t("soulActTraining", "Treinar"),
    studying: t("soulActStudying", "Estudar"),
    working: t("soulActWorking", "Trabalhar"),
    praying: t("soulActPraying", "Rezar"),
    sleeping: t("soulActSleeping", "Dormir"),
    fight: t("soulActFight", "Lutar"),
    minigame: t("soulActMinigame", "Minijogos"),
  }[a]
}

/** Como ele chama o dono agora: o apelido escolhido, ou o que mais gosta/odeia. */
export function callName(s: LifeSoul | null | undefined, t: Tr) {
  if (!s) return ""
  if (s.call.kind === "like" || s.call.kind === "hate") return foodShort(s.call.food, t)
  return s.nickname || ""
}

/** O que ele quer (o desejo em curso). */
export function wishLine(id: WishId, t: Tr) {
  return {
    fight: t("soulWishFight", "Quero lutar!"),
    home_night: t("soulWishHome", "Ficou de noite. Melhor nem sairmos de casa hoje."),
    eat_more: t("soulWishEat", "Me dá alguma coisa pra comer?"),
    fav_food: t("soulWishFav", "Tô com vontade da minha comida favorita!"),
    pray: t("soulWishPray", "Vamos na igreja rezar um pouco?"),
    rest: t("soulWishRest", "Queria descansar um pouco."),
    minigame: t("soulWishMinigame", "Bora jogar um minijogo? Quero ganhar!"),
  }[id]
}

// ── a alma de agora, para quem não recebe o aviso "life" (a rua, mob-encounter.tsx) ──
let current: LifeSoul | null = null
/** A casca do jogo grava a cada "life". */
export function setCurrentSoul(s: LifeSoul | null) {
  current = s
}
export function currentSoul() {
  return current
}

