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

const key = (id: string | null | undefined) => (id?.startsWith("espada_") ? id.slice(7) : "")

/** A espada da loja por id do item; null = não é da loja (arma antiga da classe). */
export function shopSword(id: string | null | undefined): ShopSword | null {
  const k = key(id)
  const c = COLORS[k]
  return c ? { file: `${DIR}/espada-${k}-m66.glb`, thumb: `${DIR}/thumb/${k}.webp`, main: c[0], edge: c[1] } : null
}
