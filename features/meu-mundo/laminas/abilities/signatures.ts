// features/meu-mundo/laminas/abilities/signatures.ts — o poder de cada personagem (2026-11-07).
//
// A REGRA é uma só (sim/fight.ts, re-simulada pelo servidor). Aqui fica só a forma: cada
// assinatura combina peças de abilities/signature-fx.ts, e nenhuma é o mesmo poder com outra
// cor: muda o que abre nas costas, o golpe, o que sobe do chão e o desenho no chão.
//
// Sem Babylon de propósito: a tela (skill-hud) lê este arquivo.

export type FxFamily = "blood" | "ember" | "storm" | "stone" | "shadow" | "solar" | "tide" | "prism" | "gear" | "steel"

/** O que abre atrás do corpo na carga. */
export type BackForm = "wings" | "feathers" | "tails" | "claws" | "sun" | "moon" | "gear" | "wheel" | "horns" | "crest"
/** O golpe em si. */
export type StrikeForm = "moon" | "cross" | "spin" | "bolt" | "spokes" | "rain" | "blast" | "disc" | "wave" | "smash" | "sword"
/** O que sobe do chão no impacto. */
export type RiseForm = "blades" | "flames" | "columns" | "water" | "crystals"

export interface NameText {
  key: string
  fallback: string
}

export interface Signature {
  id: string
  family: FxFamily
  /** Rampa de cor: escuro, corpo, quente, borda, topo. */
  pal: [string, string, string, string, string]
  /** Cores correndo pela peça (Íris). */
  prism?: boolean
  back: BackForm
  strike: StrikeForm
  rise: RiseForm
  /** Desenho do chão (abilities/fx/glyph-<nome>.webp). */
  glyph: string
  /** Pasta dos ícones em /meu-mundo/laminas/abilities. */
  art: string
  names: { ult: NameText; slash: NameText; dash: NameText; shield: NameText }
}

const n = (id: string, ult: string, slash: string, dash: string, shield: string): Signature["names"] => {
  const k = id.charAt(0).toUpperCase() + id.slice(1)
  return {
    ult: { key: `ability${k}Ult`, fallback: ult },
    slash: { key: `ability${k}Slash`, fallback: slash },
    dash: { key: `ability${k}Dash`, fallback: dash },
    shield: { key: `ability${k}Shield`, fallback: shield },
  }
}

export const SIGNATURES: Record<string, Signature> = {
  vampiro: {
    id: "vampiro",
    family: "blood",
    pal: ["#21010d", "#b80829", "#ff386b", "#b84dff", "#ffe0ec"],
    back: "wings",
    strike: "moon",
    rise: "blades",
    glyph: "moons",
    art: "vampiro",
    names: n("vampiro", "Golpe de Sangue", "Foice Carmesim", "Passo de Morcego", "Véu de Sangue"),
  },
  raposa: {
    id: "raposa",
    family: "ember",
    pal: ["#2a0a02", "#d9420a", "#ffa21f", "#ffe14d", "#fff6d8"],
    back: "tails",
    strike: "blast",
    rise: "flames",
    glyph: "foxfire",
    art: "raposa",
    names: n("raposa", "Coroa de Brasas", "Rabo de Fogo", "Salto da Raposa", "Círculo de Brasas"),
  },
  aurion: {
    id: "aurion",
    family: "solar",
    pal: ["#2c1a02", "#d68a12", "#ffd24d", "#fff0a8", "#fffdf0"],
    back: "sun",
    strike: "disc",
    rise: "crystals",
    glyph: "sun",
    art: "aurion",
    names: n("aurion", "Sentença Solar", "Lâmina do Meio-Dia", "Passo do Invicto", "Égide de Mármore"),
  },
  morkhan: {
    id: "morkhan",
    family: "shadow",
    pal: ["#0e0320", "#5a15c4", "#b35cff", "#ff4df0", "#f3e0ff"],
    back: "horns",
    strike: "cross",
    rise: "flames",
    glyph: "pact",
    art: "morkhan",
    names: n("morkhan", "Fogo Sem Nome", "Corte Violeta", "Sombra Rasgada", "Pacto de Cinzas"),
  },
  zephyra: {
    id: "zephyra",
    family: "storm",
    pal: ["#03102b", "#1656d9", "#4dc3ff", "#d8f6ff", "#ffffff"],
    back: "wheel",
    strike: "bolt",
    rise: "crystals",
    glyph: "storm",
    art: "zephyra",
    names: n("zephyra", "Carruagem do Trovão", "Corte de Vento", "Rastro de Raio", "Olho da Tormenta"),
  },
  kragor: {
    id: "kragor",
    family: "stone",
    pal: ["#120a06", "#6a3a1c", "#ff7a26", "#ffc14d", "#fff0d0"],
    back: "horns",
    strike: "smash",
    rise: "columns",
    glyph: "basalt",
    art: "kragor",
    names: n("kragor", "Punho de Basalto", "Golpe de Lava", "Carga do Touro", "Muralha de Basalto"),
  },
  maru: {
    id: "maru",
    family: "tide",
    pal: ["#021a24", "#0c7f96", "#35d9d0", "#b8fff2", "#ffffff"],
    back: "crest",
    strike: "wave",
    rise: "water",
    glyph: "tide",
    art: "maru",
    names: n("maru", "Maré Centésima", "Corte da Ressaca", "Salto do Tritão", "Bolha da Maré"),
  },
  iris: {
    id: "iris",
    family: "prism",
    pal: ["#1a0830", "#7a3dff", "#ff6bd6", "#ffe066", "#ffffff"],
    prism: true,
    back: "claws",
    strike: "rain",
    rise: "crystals",
    glyph: "prism",
    art: "iris",
    names: n("iris", "Prisma das Cores", "Flecha Espectral", "Passo Camaleão", "Véu Prismático"),
  },
  aeryn: {
    id: "aeryn",
    family: "gear",
    pal: ["#1a0e04", "#9a5a1c", "#ffb24d", "#ffe0a0", "#fff8e8"],
    back: "feathers",
    strike: "rain",
    rise: "blades",
    glyph: "cog",
    art: "aeryn",
    names: n("aeryn", "Asa de Bronze", "Pena Cortante", "Voo Rasante", "Asas Fechadas"),
  },
  noctis: {
    id: "noctis",
    family: "shadow",
    pal: ["#050a22", "#2a3fa8", "#8fa6ff", "#e0e6ff", "#ffffff"],
    back: "moon",
    strike: "spin",
    rise: "blades",
    glyph: "lunar",
    art: "noctis",
    names: n("noctis", "Corredor da Lua", "Tiro de Prata", "Rastro Noturno", "Eclipse"),
  },
  ciborgue: {
    id: "ciborgue",
    family: "gear",
    pal: ["#1a0802", "#a33a0a", "#ff8a1f", "#ffd84d", "#fff4d8"],
    back: "gear",
    strike: "spokes",
    rise: "columns",
    glyph: "circuit",
    art: "ciborgue",
    names: n("ciborgue", "Sobrecarga", "Rajada Térmica", "Propulsão", "Campo de Força"),
  },
  golem: {
    id: "golem",
    family: "stone",
    pal: ["#04140a", "#127a2e", "#33ff4d", "#c8ff8a", "#f4ffe8"],
    back: "gear",
    strike: "bolt",
    rise: "columns",
    glyph: "runestone",
    art: "golem",
    names: n("golem", "Pedras Gêmeas", "Soco de Pedra", "Avanço do Colosso", "Casca de Rocha"),
  },
  garras: {
    id: "garras",
    family: "shadow",
    pal: ["#14041f", "#7a14b8", "#d24dff", "#ff8ad8", "#ffe8f8"],
    back: "claws",
    strike: "cross",
    rise: "blades",
    glyph: "talon",
    art: "garras",
    names: n("garras", "Rasgo em Cruz", "Garra Dupla", "Bote da Dama", "Plumas de Aço"),
  },
  brutamontes: {
    id: "brutamontes",
    family: "shadow",
    pal: ["#120420", "#5a1ab0", "#a838ff", "#e0a0ff", "#f6e8ff"],
    back: "horns",
    strike: "smash",
    rise: "columns",
    glyph: "labyrinth",
    art: "brutamontes",
    names: n("brutamontes", "Queda do Minotauro", "Machado Roxo", "Estouro da Manada", "Couraça do Touro"),
  },
  cavaleiro: {
    id: "cavaleiro",
    family: "solar",
    pal: ["#241402", "#b8780f", "#ffc23a", "#fff0b0", "#ffffff"],
    back: "sun",
    strike: "sword",
    rise: "crystals",
    glyph: "crest",
    art: "cavaleiro",
    names: n("cavaleiro", "Juramento Dourado", "Corte Real", "Investida da Ordem", "Baluarte de Ouro"),
  },
  sergio: {
    id: "sergio",
    family: "steel",
    pal: ["#04181a", "#0f7a6a", "#1fd6a8", "#c8fff0", "#ffffff"],
    back: "wheel",
    strike: "cross",
    rise: "columns",
    glyph: "cog",
    art: "sergio",
    names: n("sergio", "Reta Final", "Corte Azul", "Arrancada", "Guarda Fechada"),
  },
  ekaterina: {
    id: "ekaterina",
    family: "tide",
    pal: ["#0a1426", "#2e6ac4", "#9fd8ff", "#ffffff", "#ffffff"],
    back: "feathers",
    strike: "rain",
    rise: "crystals",
    glyph: "frost",
    art: "ekaterina",
    names: n("ekaterina", "Rosa de Gelo", "Corte Frio", "Passo na Neve", "Espelho de Gelo"),
  },
  aventura: {
    id: "aventura",
    family: "steel",
    pal: ["#1a1208", "#a8761e", "#ffb02e", "#ffe09a", "#fff8e8"],
    back: "wheel",
    strike: "smash",
    rise: "blades",
    glyph: "compass",
    art: "aventura",
    names: n("aventura", "Golpe do Herói", "Corte Firme", "Arranque", "Guarda do Bairro"),
  },
}

const OF_BODY: Record<string, string> = {
  vampiro: "vampiro",
  vampira: "vampiro",
  vampiro_adulto: "vampiro",
  vampira_adulta: "vampiro",
  raposa: "raposa",
  raposa_f: "raposa",
  raposa_adulto: "raposa",
  raposa_adulta: "raposa",
  aurion: "aurion",
  morkhan: "morkhan",
  zephyra: "zephyra",
  kragor: "kragor",
  maru: "maru",
  iris: "iris",
  aeryn: "aeryn",
  noctis: "noctis",
  ciborgue: "ciborgue",
  golem: "golem",
  garras: "garras",
  brutamontes: "brutamontes",
  cavaleiro: "cavaleiro",
  sergio: "sergio",
  ekaterina: "ekaterina",
}

/** Corpo → assinatura. Quem não tem a sua (normal, magro, gordo, forte, feminina) é o aventureiro. */
export const signatureOf = (body: string | null | undefined): Signature => SIGNATURES[OF_BODY[body ?? ""] ?? "aventura"]

/** Altura dos olhos e centro do rosto no retrato bravo de cada corpo. */
export const CUT_EYES: Record<string, [number, number]> = {
  vampiro: [0.235, 0.5],
  vampira: [0.185, 0.49],
  vampiro_adulto: [0.225, 0.5],
  vampira_adulta: [0.19, 0.5],
  raposa: [0.28, 0.5],
  raposa_f: [0.31, 0.5],
  raposa_adulto: [0.29, 0.5],
  raposa_adulta: [0.31, 0.52],
  aurion: [0.32, 0.5],
  morkhan: [0.22, 0.5],
  kragor: [0.17, 0.5],
  zephyra: [0.3, 0.5],
  maru: [0.25, 0.5],
  iris: [0.19, 0.47],
  noctis: [0.23, 0.5],
  aeryn: [0.21, 0.68],
  cavaleiro: [0.29, 0.5],
  ciborgue: [0.15, 0.5],
  golem: [0.27, 0.5],
  garras: [0.2, 0.5],
}
