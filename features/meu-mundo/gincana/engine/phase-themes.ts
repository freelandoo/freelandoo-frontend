// features/meu-mundo/gincana/engine/phase-themes.ts — GINCANA 2.0 (2026-11-16): o que só o DESENHO e a TELA sabem das fases.
//
// A regra de cada fase fica em sim/courses.ts. Aqui: nome, Domínio, os nomes
// dos trechos e as dicas do menu (chave de i18n + português), a cor de
// destaque da tela e, para o 3D, a paleta dos tampos (mesmos índices de
// GINCANA_COLORS), o "mar" embaixo (água, pântano, abismo, vazio, lava, óleo,
// água gelada), o cenário em volta e se o céu segue o relógio de Brasília ou
// fica fixo (a Orbital é sempre noite; a Floresta da Lua, quase).

import type { GincanaPhase } from "../sim/course"

export type RGB = readonly [number, number, number]

export type GincanaDeco = "city" | "forest" | "canyon" | "orbital" | "forge" | "factory" | "ice"

export interface GincanaTheme {
  id: GincanaPhase
  num: string
  nameKey: string
  name: string
  domainKey: string
  domain: string
  pitchKey: string
  pitch: string
  /** Nomes dos trechos: largada, 1…5, chegada. */
  sections: readonly (readonly [string, string])[]
  /** Dica de cada trecho 1…5. */
  tips: readonly (readonly [string, string])[]
  /** Gincana 3: o nome da PROVA (cada fase é um tipo de prova). */
  event: readonly [string, string]
  /** 1–5 (estrelas no cartão). */
  difficulty: number
  accent: string
  /** Degradê do cartão. */
  bg: readonly [string, string]
  /** Paleta dos tampos e bordas (índices de GINCANA_COLORS). */
  palette: readonly RGB[]
  /** O que fica embaixo (y = 0): cor de dia e de noite, brilho próprio (lava/vazio) e os reflexos. */
  fluid: { day: string; night: string; glow: number; streak: string; kind: "water" | "lava" | "void" | "oil" | "ice" }
  /** Céu: null = relógio de Brasília; número = noite fixa (0–1). */
  night: number | null
  deco: GincanaDeco
}

const SEC0: readonly [string, string] = ["gincanaSec0", "Largada"]
const SEC6: readonly [string, string] = ["gincanaSec6", "Chegada"]

export const GINCANA_THEMES: readonly GincanaTheme[] = [
  {
    id: "cidade",
    num: "01",
    nameKey: "gincanaPhCidade",
    name: "Canal da Cidade",
    domainKey: "gincanaDomCidade",
    domain: "A cidade",
    pitchKey: "gincanaPhCidadePitch",
    pitch: "A prova de sempre sobre o canal: carrossel, passarelas, luvas, xadrez e a subida.",
    sections: [SEC0, ["gincanaSec1", "Carrossel"], ["gincanaSec2", "Passarelas"], ["gincanaSec3", "Luvas"], ["gincanaSec4", "Xadrez"], ["gincanaSec5", "Subida"], SEC6],
    tips: [
      ["gincanaHow1", "A barra gira rente ao chão: pule na hora certa."],
      ["gincanaHow2", "Vigas estreitas e bolas de pêndulo: espere a bola passar."],
      ["gincanaHow3", "Luvas socam dos lados: passe quando elas voltarem."],
      ["gincanaHow4", "O piso treme e cai logo depois que alguém pisa."],
      ["gincanaHow5", "Bolas gigantes descem a rampa: desvie até o topo."],
    ],
    event: ["gincanaEvCidade", "Corrida do Canal"],
    difficulty: 2,
    accent: "#19C6D1",
    bg: ["#1d4f6e", "#0b1b2b"],
    palette: [
      [0.72, 0.42, 0.22],
      [0.78, 0.6, 0.28],
      [0.56, 0.14, 0.15],
      [0.26, 0.48, 0.42],
      [0.34, 0.17, 0.32],
      [0.4, 0.46, 0.2],
      [0.2, 0.3, 0.44],
      [0.82, 0.76, 0.66],
    ],
    fluid: { day: "#16C2CF", night: "#0a2a36", glow: 0, streak: "rgba(255,255,255,0.55)", kind: "water" },
    night: null,
    deco: "city",
  },
  {
    id: "floresta",
    num: "02",
    nameKey: "gincanaPhFloresta",
    name: "Floresta da Lua",
    domainKey: "gincanaDomFloresta",
    domain: "Domínio da Floresta",
    pitchKey: "gincanaPhFlorestaPitch3",
    pitch: "Suba a árvore gigante antes que o pântano pegue você: quem ele alcança está fora.",
    sections: [SEC0, ["gincanaSecFm1", "Troncos"], ["gincanaSecFm2", "Raízes"], ["gincanaSecFm3", "Vitórias-régias"], ["gincanaSecFm4", "Cocos"], ["gincanaSecFm5", "Ponte de folhas"], SEC6],
    tips: [
      ["gincanaHowFm1", "Troncos rolam ladeira abaixo: desvie e não pare, o pântano já está subindo."],
      ["gincanaHowFm2", "Raízes giram rente ao chão: pule na hora certa."],
      ["gincanaHowFm3", "As vitórias-régias andam de lado: pule quando a próxima chegar."],
      ["gincanaHowFm4", "Cocos balançam sobre a rampa: passe quando o da sua faixa voltar."],
      ["gincanaHowFm5", "As folhas caem logo depois que alguém pisa. O topo é a chegada."],
    ],
    event: ["gincanaEvFloresta", "Maré do Pântano"],
    difficulty: 2,
    accent: "#7CFFB0",
    bg: ["#1f4a3a", "#08140f"],
    palette: [
      [0.28, 0.42, 0.2],
      [0.46, 0.3, 0.16],
      [0.86, 0.3, 0.62],
      [0.2, 0.5, 0.46],
      [0.36, 0.22, 0.5],
      [0.34, 0.6, 0.26],
      [0.18, 0.3, 0.42],
      [0.78, 0.86, 0.8],
    ],
    fluid: { day: "#23a35a", night: "#0d6a3a", glow: 0.32, streak: "rgba(170,255,190,0.6)", kind: "water" },
    night: 0.78,
    deco: "forest",
  },
  {
    id: "canion",
    num: "03",
    nameKey: "gincanaPhCanion",
    name: "Cânion Flutuante",
    domainKey: "gincanaDomCanion",
    domain: "Domínio do Cânion",
    pitchKey: "gincanaPhCanionPitch3",
    pitch: "Quatro andares de pedras sobre o abismo: cada pedra pisada cai. Fique em pé até sobrar só a vaga.",
    sections: [SEC0, ["gincanaSecCs1", "Pedra pisada"], ["gincanaSecCs2", "Pular"], ["gincanaSecCs3", "Andares"], ["gincanaSecCs4", "Empurrão"], ["gincanaSecCs5", "Vaga"], SEC6],
    tips: [
      ["gincanaHowCs1", "A pedra que você pisa treme e cai em 1 segundo: não fique parado."],
      ["gincanaHowCs2", "No ar você não derruba pedra: pular poupa o chão."],
      ["gincanaHowCs3", "Caiu num buraco? Há mais três andares embaixo."],
      ["gincanaHowCs4", "Agarre e mergulhe nos outros para derrubá-los num buraco."],
      ["gincanaHowCs5", "Quem cai do último andar está fora. Sobrando só a vaga, acabou."],
    ],
    event: ["gincanaEvCanion", "Pedras que Caem"],
    difficulty: 3,
    accent: "#FF9A4D",
    bg: ["#6e3418", "#1e0c06"],
    palette: [
      [0.78, 0.44, 0.24],
      [0.86, 0.66, 0.38],
      [0.62, 0.24, 0.16],
      [0.3, 0.42, 0.4],
      [0.46, 0.28, 0.3],
      [0.5, 0.48, 0.28],
      [0.3, 0.32, 0.4],
      [0.9, 0.8, 0.64],
    ],
    fluid: { day: "#d6b2cf", night: "#3a2a4a", glow: 0.1, streak: "rgba(255,255,255,0.35)", kind: "void" },
    night: null,
    deco: "canyon",
  },
  {
    id: "orbital",
    num: "04",
    nameKey: "gincanaPhOrbital",
    name: "Cidade Orbital",
    domainKey: "gincanaDomOrbital",
    domain: "Domínio Orbital",
    pitchKey: "gincanaPhOrbitalPitch",
    pitch: "Esteiras para trás, anéis que giram e hexágonos que somem debaixo dos pés.",
    sections: [SEC0, ["gincanaSecOr1", "Esteiras"], ["gincanaSecOr2", "Anéis giratórios"], ["gincanaSecOr3", "Hexágonos"], ["gincanaSecOr4", "Barreiras de energia"], ["gincanaSecOr5", "Esferas"], SEC6],
    tips: [
      ["gincanaHowOr1", "A esteira puxa para trás: corra e desvie das caixas."],
      ["gincanaHowOr2", "Os anéis giram e levam você junto: mire no meio."],
      ["gincanaHowOr3", "O hexágono some logo depois que alguém pisa."],
      ["gincanaHowOr4", "Barras de energia giram e blocos deslizam: pule e espere."],
      ["gincanaHowOr5", "Esferas descem a rampa: desvie até o topo."],
    ],
    event: ["gincanaEvRace", "Corrida de obstáculos"],
    difficulty: 4,
    accent: "#3FD8FF",
    bg: ["#1a2a6e", "#05081c"],
    palette: [
      [0.86, 0.88, 0.94],
      [0.98, 0.78, 0.3],
      [0.9, 0.32, 0.66],
      [0.2, 0.7, 0.8],
      [0.48, 0.34, 0.9],
      [0.36, 0.82, 0.62],
      [0.26, 0.5, 0.92],
      [0.94, 0.96, 1],
    ],
    fluid: { day: "#05061a", night: "#020210", glow: 0.12, streak: "rgba(255,255,255,0.9)", kind: "void" },
    night: 1,
    deco: "orbital",
  },
  {
    id: "forja",
    num: "05",
    nameKey: "gincanaPhForja",
    name: "Forja de Kragor",
    domainKey: "gincanaDomForja",
    domain: "Domínio da Forja",
    pitchKey: "gincanaPhForjaPitch",
    pitch: "Martelos, pistões dos dois lados e esteiras de lado sobre a lava.",
    sections: [SEC0, ["gincanaSecFo1", "Martelos"], ["gincanaSecFo2", "Pistões"], ["gincanaSecFo3", "Esteiras de lava"], ["gincanaSecFo4", "Grade que cai"], ["gincanaSecFo5", "Rochas derretidas"], SEC6],
    tips: [
      ["gincanaHowFo1", "Martelos balançam de lado: espere passar."],
      ["gincanaHowFo2", "Pistões socam dos dois lados ao mesmo tempo."],
      ["gincanaHowFo3", "As esteiras empurram para a lava: corra contra."],
      ["gincanaHowFo4", "A grade cai logo depois que alguém pisa."],
      ["gincanaHowFo5", "Rochas derretidas descem a rampa: desvie até o topo."],
    ],
    event: ["gincanaEvRace", "Corrida de obstáculos"],
    difficulty: 4,
    accent: "#FF5A1F",
    bg: ["#5e1a08", "#160502"],
    palette: [
      [0.32, 0.28, 0.27],
      [0.72, 0.52, 0.24],
      [0.7, 0.2, 0.08],
      [0.3, 0.4, 0.38],
      [0.4, 0.22, 0.2],
      [0.46, 0.4, 0.22],
      [0.24, 0.26, 0.32],
      [0.68, 0.62, 0.56],
    ],
    fluid: { day: "#ff5a12", night: "#ff4a0a", glow: 0.95, streak: "rgba(255,230,120,0.85)", kind: "lava" },
    night: 0.55,
    deco: "forge",
  },
  {
    id: "fabrica",
    num: "06",
    nameKey: "gincanaPhFabrica",
    name: "Fábrica de Engrenagens",
    domainKey: "gincanaDomFabrica",
    domain: "Domínio da Fábrica",
    pitchKey: "gincanaPhFabricaPitch",
    pitch: "Esteira das prensas, engrenagens que giram, portas de aço e prensas deslizantes.",
    sections: [SEC0, ["gincanaSecFa1", "Esteira das prensas"], ["gincanaSecFa2", "Engrenagens"], ["gincanaSecFa3", "Portas de aço"], ["gincanaSecFa4", "Prensas deslizantes"], ["gincanaSecFa5", "Barris"], SEC6],
    tips: [
      ["gincanaHowFa1", "A esteira puxa para trás e as prensas socam dos lados."],
      ["gincanaHowFa2", "As engrenagens giram e levam você junto."],
      ["gincanaHowFa3", "Só algumas portas abrem: siga quem já passou."],
      ["gincanaHowFa4", "As prensas deslizam de lado: passe na brecha."],
      ["gincanaHowFa5", "Barris descem a rampa: desvie até o topo."],
    ],
    event: ["gincanaEvRace", "Corrida de obstáculos"],
    difficulty: 3,
    accent: "#FFC21A",
    bg: ["#3e3a2c", "#121110"],
    palette: [
      [0.62, 0.36, 0.2],
      [0.92, 0.72, 0.12],
      [0.62, 0.18, 0.14],
      [0.3, 0.44, 0.42],
      [0.36, 0.3, 0.36],
      [0.42, 0.44, 0.3],
      [0.36, 0.4, 0.46],
      [0.7, 0.7, 0.68],
    ],
    fluid: { day: "#1b1a1e", night: "#0a0a0d", glow: 0.04, streak: "rgba(160,120,255,0.35)", kind: "oil" },
    night: null,
    deco: "factory",
  },
  {
    id: "gelo",
    num: "07",
    nameKey: "gincanaPhGelo",
    name: "Mar de Gelo",
    domainKey: "gincanaDomGelo",
    domain: "Domínio do Mar de Gelo",
    pitchKey: "gincanaPhGeloPitch",
    pitch: "Lago que escorrega, estalactites, placas de gelo que andam e gelo fino.",
    sections: [SEC0, ["gincanaSecGe1", "Lago escorregadio"], ["gincanaSecGe2", "Estalactites"], ["gincanaSecGe3", "Placas de gelo"], ["gincanaSecGe4", "Gelo fino"], ["gincanaSecGe5", "Bolas de neve"], SEC6],
    tips: [
      ["gincanaHowGe1", "No gelo você escorrega: solte cedo para parar."],
      ["gincanaHowGe2", "Estalactites balançam sobre as pontes: espere passar."],
      ["gincanaHowGe3", "As placas andam de lado: espere a próxima chegar."],
      ["gincanaHowGe4", "O gelo fino quebra logo depois que alguém pisa."],
      ["gincanaHowGe5", "Bolas de neve descem a rampa: desvie até o topo."],
    ],
    event: ["gincanaEvRace", "Corrida de obstáculos"],
    difficulty: 3,
    accent: "#A8E6FF",
    bg: ["#2a5a7e", "#0a1826"],
    palette: [
      [0.62, 0.78, 0.9],
      [0.84, 0.9, 0.96],
      [0.5, 0.62, 0.86],
      [0.3, 0.56, 0.66],
      [0.5, 0.5, 0.76],
      [0.56, 0.74, 0.78],
      [0.4, 0.58, 0.8],
      [0.94, 0.97, 1],
    ],
    fluid: { day: "#2c6f9c", night: "#0b2236", glow: 0, streak: "rgba(230,250,255,0.7)", kind: "ice" },
    night: null,
    deco: "ice",
  },
]

export function themeOf(id: string | null | undefined): GincanaTheme {
  return GINCANA_THEMES.find((t) => t.id === id) ?? GINCANA_THEMES[0]
}
