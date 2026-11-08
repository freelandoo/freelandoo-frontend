// features/meu-mundo/soul.ts — a "alma" do hóspede na tela (mm3d-72).
//
// A regra é do servidor (freelandoo-backend/src/utils/meuMundoSoul.js): aqui só
// os nomes e as frases. Pedido do Alex (2026-11-07): personalidade (psicopata,
// covarde, comilão, bondoso, competitivo), quanto ele gosta do dono, o que mais
// gosta e mais odeia, e o apelido com que ele chama o dono.

export type Temper = "psicopata" | "covarde" | "comilao" | "bondoso" | "competitivo"
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
}

export function temperLabel(x: Temper, t: Tr) {
  return {
    psicopata: t("soulPsycho", "Psicopata"),
    covarde: t("soulCoward", "Covarde"),
    comilao: t("soulGlutton", "Comilão"),
    bondoso: t("soulKind", "Bondoso"),
    competitivo: t("soulCompetitive", "Competitivo"),
  }[x]
}

export function temperLine(x: Temper, t: Tr) {
  return {
    psicopata: t("soulPsychoLine", "Ataca às vezes sem querer e entra em luta só de passar perto. Contra inimigo bem mais forte, solta o Poder Máximo três vezes."),
    covarde: t("soulCowardLine", "Às vezes recusa lutas e às vezes desiste no meio. De noite prefere ficar em casa."),
    comilao: t("soulGluttonLine", "Quer comer mais do que o normal e fica feliz com qualquer lanche."),
    bondoso: t("soulKindLine", "Gosta de cuidar, rezar e descansar. Fica magoado fácil."),
    competitivo: t("soulCompetitiveLine", "Quer ficar indo nos minijogos e lutar para ganhar."),
  }[x]
}

/** Nome curto da comida (é também o apelido que ele usa: "Ei, Pizza!"). */
export function foodShort(id: string, t: Tr) {
  const m: Record<string, [string, string]> = {
    salmao_legumes: ["soulFoodSalmon", "Salmão"],
    frango_salada: ["soulFoodChicken", "Frango"],
    prato_integral: ["soulFoodWholegrain", "Integral"],
    bowl_frutas: ["soulFoodFruit", "Frutinha"],
    omelete_legumes: ["soulFoodOmelette", "Omelete"],
    iogurte_aveia: ["soulFoodYogurt", "Iogurte"],
    sopa_legumes: ["soulFoodSoup", "Sopinha"],
    prato_feito: ["soulFoodPF", "PF"],
    hamburguer: ["soulFoodBurger", "Hambúrguer"],
    pizza: ["soulFoodPizza", "Pizza"],
    cachorro_quente: ["soulFoodHotdog", "Cachorro-quente"],
    coxinha: ["soulFoodCoxinha", "Coxinha"],
    chocolate: ["soulFoodChocolate", "Chocolate"],
    miojo: ["soulFoodNoodles", "Miojo"],
    salgadinho: ["soulFoodChips", "Salgadinho"],
    biscoito_recheado: ["soulFoodCookie", "Biscoito"],
    refrigerante: ["soulFoodSoda", "Refri"],
    agua_coco: ["soulFoodCoconut", "Água de coco"],
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

/**
 * mm3d-72 (regra do Alex): o COVARDE às vezes recusa a luta na rua. Quanto mais
 * ele gosta do dono, menor a chance (afeto 0: 40%; 100: 20%; 300: 10%).
 */
export const COWARD_REFUSE = { p: 0.4, affHalf: 100 }
export function cowardRefuses(s: LifeSoul | null, roll = Math.random()) {
  if (!s || s.temper !== "covarde") return false
  return roll < COWARD_REFUSE.p / (1 + Math.max(0, s.affection) / COWARD_REFUSE.affHalf)
}
