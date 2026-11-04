// features/meu-mundo/engine/shop-swords.ts — espadas da Loja de Armas (mm3d-66).
//
// A arma muda só o modelo na mão e a cor do rastro: os golpes vêm do personagem
// vestido (regra do Alex). Todas no padrão da espada dos vampiros: 6 mil
// triângulos, textura 512, 1,05 m com a pegada de engine/weapon-grip.ts — por
// isso entram no mesmo encaixe e na mesma escala. Modelos e miniaturas saem de
// MEU MUNDO 3D/pipeline/armas/build_espadas_loja.py.
// Espelho dos ids `espada_*` com `shop: "weapons"` em src/utils/meuMundoGear.js.

const DIR = "/meu-mundo/armas/v2"

/** Cor do rastro do golpe: [principal, borda]. */
const COLORS: Record<string, [string, string]> = {
  aco: ["#6E9CC8", "#CFE3F5"],
  viajante: ["#7A9AB5", "#D3E2EE"],
  prata: ["#A077D6", "#E2D2F7"],
  vigia: ["#B0894A", "#EBD3A4"],
  cutelo: ["#7C7F88", "#C2C5CC"],
  silencio: ["#C43A4A", "#F5A0A8"],
  carmesim: ["#E0283C", "#FFB0B8"],
  muralha: ["#6E84AE", "#CBD7EC"],
  brasa: ["#FF7A1F", "#FFD08A"],
  meia_noite: ["#3E5F8C", "#A9C8F0"],
  celeste: ["#2FB7FF", "#C7F0FF"],
  alvorada: ["#FFC83D", "#FFF2B0"],
  morkhan: ["#A247FF", "#E2C2FF"],
  chama: ["#FF5A1F", "#FFC48A"],
  ceifadora: ["#D4183C", "#FFA0A8"],
  abismo: ["#7A3CFF", "#D6C2FF"],
}

/** Aba Hammers (mm3d-67): 3 m no arquivo, padrão do machado do Brutamontes. */
const HEAVY_COLORS: Record<string, [string, string]> = {
  ferreiro: ["#C98A4A", "#F0D2A8"],
  lenhador: ["#A8927A", "#E6D8C6"],
  caveira: ["#B5763E", "#EFCFA6"],
  lava: ["#FF6A1F", "#FFC48A"],
  noite: ["#4E6B8C", "#B6CCE4"],
  lanca: ["#8FA4B8", "#DCE6EF"],
  bigorna: ["#7C7F88", "#C2C5CC"],
  cravos: ["#8A7F74", "#D2CABF"],
  gume: ["#4FB4E8", "#CDEBFA"],
  coral: ["#E8413A", "#FFB4AE"],
  caldeira: ["#C8813A", "#F2D3A4"],
  mares: ["#3FA88F", "#BFEADF"],
  ornada: ["#B59A52", "#EFE0B0"],
  eter: ["#47C8E8", "#C7F2FB"],
  mitica: ["#D4183C", "#FFA0A8"],
  espinhos: ["#B8243A", "#F5A8B2"],
  praga: ["#C21F3A", "#F7A2AE"],
  neon: ["#3D5BFF", "#C2CEFF"],
}

/** Arcos (mm3d-69): 1 m no arquivo, build_arcos_loja.py. A cor é a da flecha de luz. */
const BOW_COLORS: Record<string, [string, string]> = {
  caca: ["#FFD27A", "#FFF3D0"],
  teixo: ["#FFC46B", "#FFEBC4"],
  ronda: ["#FF9A5A", "#FFDCC2"],
  cobre: ["#FF8A3D", "#FFD2AE"],
  aco_negro: ["#7FA8D6", "#D6E6F7"],
  sentinela: ["#B5D66B", "#E8F5C4"],
  galhos: ["#F0C04A", "#FFF0BE"],
  safira: ["#3D7BFF", "#BFD6FF"],
  lua: ["#A9B8FF", "#E4E9FF"],
  mares: ["#2FE0C0", "#C4FFF2"],
  celeste: ["#47C8FF", "#D0F2FF"],
  eclipse: ["#FFB84A", "#FFE9C0"],
  laminas: ["#9FB4D0", "#E2EAF4"],
  asa_branca: ["#FFF2C8", "#FFFFFF"],
  ametista: ["#B45CFF", "#EBD2FF"],
  plumas: ["#FFD9A0", "#FFF4E0"],
  estrelas: ["#5C8CFF", "#D0DEFF"],
  dragao: ["#FF2B4A", "#FFC0CA"],
  rubro: ["#FF3048", "#FFB8C2"],
}
/** Arco próprio da deusa (não está à venda): a skin atira com ele sem arco de loja. */
const GOD_BOWS: Record<string, [string, string]> = {
  iris: ["#FF4FD8", "#7DE8FF"],
  aeryn: ["#FFC23D", "#FFF2C0"],
}
const bowOf = (k: string, c: [string, string] | undefined): ShopSword | null =>
  c ? { file: `${DIR}/arco-${k}-m69.glb`, thumb: `${DIR}/thumb/arco-${k}.webp`, main: c[0], edge: c[1] } : null

/** O arco da loja por id do item; null = não é da aba Arcos. */
export function shopBow(id: string | null | undefined): ShopSword | null {
  const k = id?.startsWith("arco_") ? id.slice(5) : ""
  return bowOf(k, BOW_COLORS[k])
}

export function godBow(body: string | null | undefined): ShopSword | null {
  return body ? bowOf(body, GOD_BOWS[body]) : null
}

/** Armas de fogo (mm3d-70): build_guns_loja.py. A cor é a do tiro de luz. */
const GUN_COLORS: Record<string, [string, string]> = {
  sucata: ["#FFB45A", "#FFE6C2"],
  revolver: ["#8FC8FF", "#DCEEFF"],
  patrulha: ["#FF8A4A", "#FFDCC6"],
  dupla: ["#5CE0E8", "#CFF7FA"],
  pistola: ["#FF4A4A", "#FFCACA"],
  mira: ["#47B8FF", "#CBEBFF"],
  trabuco: ["#5CE8C8", "#CFFAF0"],
  raios: ["#FF6A4A", "#FFD2C6"],
  tambor: ["#C86AFF", "#EDD2FF"],
  garra: ["#FFB02E", "#FFE8BC"],
  vapor: ["#FF7A3D", "#FFD6C2"],
  rubro: ["#FF3A4A", "#FFC4CA"],
  neon: ["#2FE8D8", "#C6FAF4"],
  pinca: ["#3DA8FF", "#C6E4FF"],
  rosa: ["#FF007A", "#FFB3D6"],
  serpente: ["#E8203C", "#FFB8C2"],
  pulso: ["#B45CFF", "#EBD2FF"],
  assalto: ["#FF8A1F", "#FFDCB4"],
  sombra: ["#A99CFF", "#E4DEFF"],
}
/** Arma própria da skin (não está à venda): atira com ela sem arma de loja. */
const GOD_GUNS: Record<string, [string, string]> = {
  ciborgue: ["#FF8A1F", "#FFE0B8"],
  noctis: ["#2FC2FF", "#CFEFFF"],
}
const gunOf = (k: string, c: [string, string] | undefined): ShopSword | null =>
  c ? { file: `${DIR}/fogo-${k}-m70.glb`, thumb: `${DIR}/thumb/fogo-${k}.webp`, main: c[0], edge: c[1] } : null

/** A arma de fogo da loja por id do item; null = não é da aba Guns. */
export function shopGun(id: string | null | undefined): ShopSword | null {
  const k = id?.startsWith("fogo_") ? id.slice(5) : ""
  return gunOf(k, GUN_COLORS[k])
}

export function godGun(body: string | null | undefined): ShopSword | null {
  return body ? gunOf(body, GOD_GUNS[body]) : null
}

/** Escudos da loja (mm3d-68): 1 m no arquivo, build_escudos_loja.py. Espelho de `escudo_*` em meuMundoGear.js. */
const SHIELDS = new Set(["ferro", "rebites", "azul", "cravos", "sol", "prata", "filigrana", "bosque", "ametista", "caveira", "lava", "lanterna", "demonio", "alvorada", "fe", "fera"])

/** O escudo da loja por id do item; null = sem escudo. */
export function shopShield(id: string | null | undefined): { file: string; thumb: string } | null {
  const k = id?.startsWith("escudo_") ? id.slice(7) : ""
  return SHIELDS.has(k) ? { file: `${DIR}/escudo-${k}-m68.glb`, thumb: `${DIR}/thumb/escudo-${k}.webp` } : null
}

export interface ShopSword {
  file: string
  thumb: string
  main: string
  edge: string
}

/** A arma pesada da loja por id do item; null = não é da aba Hammers. */
export function shopHeavy(id: string | null | undefined): ShopSword | null {
  const k = id?.startsWith("pesada_") ? id.slice(7) : ""
  const c = HEAVY_COLORS[k]
  return c ? { file: `${DIR}/pesada-${k}-m67.glb`, thumb: `${DIR}/thumb/${k}.webp`, main: c[0], edge: c[1] } : null
}

/** Arma própria do deus (não está à venda): a skin luta com ela sem arma de loja equipada. */
const GOD_HEAVY: Record<string, [string, string]> = {
  maru: ["#2FC8F0", "#FFB4C4"],
  kragor: ["#FF6A1F", "#FFC48A"],
}

export function godHeavy(body: string | null | undefined): ShopSword | null {
  const c = body ? GOD_HEAVY[body] : undefined
  return c ? { file: `${DIR}/pesada-${body}-m67.glb`, thumb: "", main: c[0], edge: c[1] } : null
}

const key = (id: string | null | undefined) => (id?.startsWith("espada_") ? id.slice(7) : "")

/** A espada da loja por id do item; null = não é da loja (arma antiga da classe). */
export function shopSword(id: string | null | undefined): ShopSword | null {
  const k = key(id)
  const c = COLORS[k]
  return c ? { file: `${DIR}/espada-${k}-m66.glb`, thumb: `${DIR}/thumb/${k}.webp`, main: c[0], edge: c[1] } : null
}
