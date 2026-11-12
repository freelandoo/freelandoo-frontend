// features/meu-mundo/engine/audio/cues.ts — que arquivo toca em cada momento do jogo (áudio S1).
//
// Fonte única dos nomes: o asset é o id do pedido em C:\Users\Alex\ComfyUI-Audio\gerador\pedidos.json
// (montar_pedidos.py, tirado do código), com "." trocado por "-". Mudou o nome lá = muda aqui.

/** Interface (menu em 5 portões, mochila, viagens, portas). */
export const UI = {
  /** Plins metálicos recortados do fundo da praça (pedido do Alex, 2026-11-11). */
  drawerOpen: "ui-menu-abrir",
  menuHover: "ui-menu-passar",
  drawerClose: "ui-gaveta-fechar",
  gate: "ui-portao-trocar",
  card: "ui-card-trocar",
  bagOpen: "ui-mochila-abrir",
  bagPick: "ui-mochila-escolher",
  equip: "ui-equipar",
  unequip: "ui-tirar",
  useItem: "ui-usar-item",
  travelCenter: "ui-viagem-centro",
  travelHome: "ui-viagem-bairro",
  doorIn: "ui-porta-entrar",
  doorOut: "ui-porta-sair",
  click: "ui-clique",
  notify: "ui-notificacao",
  reward: "ui-recompensa",
  levelUp: "ui-nivel",
  questStep: "ui-missao-passo",
  buy: "ui-compra",
  error: "ui-erro",
  chat: "ui-chat",
} as const
export type UiCue = keyof typeof UI

/** Piso → passos (interiores: `mat` das salas de meuMundoCenterInteriors.js; fora: o chão do lugar). */
export type Floor = "wood" | "tile" | "carpet" | "stone" | "rubber" | "rua" | "grama" | "terra" | "areia" | "neve" | "metal"
export const steps = (floor: Floor, run: boolean) => `passos-${floor}${run ? "-correr" : ""}`
export const FLOORS: Floor[] = ["wood", "tile", "carpet", "stone", "rubber", "rua", "grama", "terra", "areia", "neve", "metal"]

/** Luta das Lâminas: o que toca em cada FightEvent (laminas/sim/fight.ts). */
export const FIGHT = {
  swing: ["luta-comum-swing-1", "luta-comum-swing-2", "luta-comum-swing-3"],
  hitLight: "luta-comum-hit-leve",
  hitHeavy: "luta-comum-hit-pesado",
  crit: "luta-comum-critico",
  miss: "luta-comum-erro",
  dodge: "luta-comum-esquiva",
  ko: "luta-comum-queda-ko",
  win: "luta-comum-sino-vitoria",
  lose: "luta-comum-sino-derrota",
  ready: "luta-comum-pronto",
  denied: "luta-comum-negado",
  fireballOut: "luta-comum-bola-fogo-sai",
  fireballBoom: "luta-comum-bola-fogo-explode",
  /** Camadas gerais do estrondo do Poder MAX (pedido do Alex: explosão, estrondo, terremoto). */
  max: ["luta-max-terremoto", "luta-max-estrondo-trovao", "luta-max-explosao-gigante", "luta-max-chao-rachando",
    "luta-max-onda-de-choque", "luta-max-desabamento", "luta-max-impacto-meteoro", "luta-max-rugido-da-terra"],
  /** As ondas de pressão que vêm depois do estrondo, em sequência (pedido do Alex: "várias pressões"). */
  pressure: ["luta-max-pressao-1", "luta-max-pressao-2", "luta-max-pressao-3", "luta-max-pressao-4"],
} as const

/** Poder Máximo de cada assinatura (abilities/signatures.ts: o id da assinatura). */
export const ult = (sig: string) => ({
  charge: `luta-${sig}-ult-carga`,
  impact: `luta-${sig}-ult-impacto`,
  quake: `luta-${sig}-ult-estrondo`,
})

/** Corte / Investida / Escudo pela família de efeito da assinatura (FxFamily). */
export const skill = (family: string) => ({
  slashCast: `luta-${family}-slash-cast`,
  slashImpact: `luta-${family}-slash-impact`,
  dash: `luta-${family}-dash-cast`,
  shieldUp: `luta-${family}-shield-up`,
  shieldHit: `luta-${family}-shield-hit`,
  shieldDown: `luta-${family}-shield-down`,
})

/** Monstro (MobKind) e deus (grito na troca de fase). */
export const mob = (kind: string) => ({
  warn: `monstro-${kind}-aviso`,
  strike: `monstro-${kind}-ataque`,
  hurt: `monstro-${kind}-dor`,
  death: `monstro-${kind}-morte`,
})
export const godRoar = (god: string) => `deus-${god}-grito`

/** O que baixar ao abrir uma luta (sem bloquear: o que não chegar a tempo toca no sintetizador). */
export function fightPreload(sig: string, family: string, kinds: string[], god?: string | null): string[] {
  const s = skill(family)
  const u = ult(sig)
  return [
    ...FIGHT.swing, FIGHT.hitLight, FIGHT.hitHeavy, FIGHT.crit, FIGHT.miss, FIGHT.dodge, FIGHT.ko, FIGHT.win, FIGHT.lose,
    FIGHT.ready, FIGHT.denied, FIGHT.fireballOut, FIGHT.fireballBoom, ...FIGHT.max, ...FIGHT.pressure,
    u.charge, u.impact, u.quake, s.slashCast, s.slashImpact, s.dash, s.shieldUp, s.shieldHit, s.shieldDown,
    ...kinds.flatMap((k) => Object.values(mob(k))),
    ...(god ? [godRoar(god)] : []),
  ]
}
