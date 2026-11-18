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
    pitchKey: "gincanaPhOrbitalPitch3",
    pitch: "Um disco no vazio e duas barras que giram cada vez mais rápido: pule a baixa, mergulhe por baixo da alta.",
    sections: [SEC0, ["gincanaSecOv1", "Barra baixa"], ["gincanaSecOv2", "Barra alta"], ["gincanaSecOv3", "Disco"], ["gincanaSecOv4", "Empurrão"], ["gincanaSecOv5", "Vaga"], SEC6],
    tips: [
      ["gincanaHowOv1", "A barra rente ao chão: pule na hora certa."],
      ["gincanaHowOv2", "A barra na altura do peito: mergulhe para passar por baixo."],
      ["gincanaHowOv3", "O disco gira devagar e leva você junto. A beira é o vazio."],
      ["gincanaHowOv4", "Agarre e mergulhe nos outros para jogá-los na barra."],
      ["gincanaHowOv5", "As barras aceleram até o fim. Sobrando só a vaga, acabou."],
    ],
    event: ["gincanaEvOrbital", "Varredura"],
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
    pitchKey: "gincanaPhForjaPitch3",
    pitch: "Paredes de brasa atravessam a arena sobre a lava: ache o vão ou pule a mureta, ou a parede joga você na lava.",
    sections: [SEC0, ["gincanaSecFw1", "O vão"], ["gincanaSecFw2", "Dois vãos"], ["gincanaSecFw3", "Mureta"], ["gincanaSecFw4", "Em pares"], ["gincanaSecFw5", "Vaga"], SEC6],
    tips: [
      ["gincanaHowFw1", "Cada parede tem um buraco: fique na frente dele antes de ela chegar."],
      ["gincanaHowFw2", "Às vezes são dois vãos: vá ao mais perto."],
      ["gincanaHowFw3", "A mureta baixa não tem vão: pule na hora."],
      ["gincanaHowFw4", "Depois de 40 s as paredes vêm em pares e mais rápidas."],
      ["gincanaHowFw5", "Quem a parede empurra para fora cai na lava. Sobrando só a vaga, acabou."],
    ],
    event: ["gincanaEvForja", "Paredes de Brasa"],
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
    pitchKey: "gincanaPhFabricaPitch3",
    pitch: "Engrenagens aparecem pela fábrica entre esteiras e prensas: pegue mais que os outros em 75 segundos.",
    sections: [SEC0, ["gincanaSecFg1", "Engrenagem"], ["gincanaSecFg2", "Dourada"], ["gincanaSecFg3", "Esteiras"], ["gincanaSecFg4", "Prensas"], ["gincanaSecFg5", "Óleo"], SEC6],
    tips: [
      ["gincanaHowFg1", "Cada engrenagem vale 1 e volta 7 segundos depois de pega."],
      ["gincanaHowFg2", "A dourada, no alto do meio, vale 3: pule para pegar."],
      ["gincanaHowFg3", "As esteiras levam você junto, cada uma para um lado."],
      ["gincanaHowFg4", "As prensas deslizam de lado e derrubam quem está no caminho."],
      ["gincanaHowFg5", "Caiu no óleo? Volta ao meio, só perdeu tempo. Classifica a metade de cima."],
    ],
    event: ["gincanaEvFabrica", "Caça às Engrenagens"],
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
    pitchKey: "gincanaPhGeloPitch3",
    pitch: "Fique no topo do iceberg: cada segundo lá em cima vale um ponto. Em 70 segundos, quem fica mais é rei.",
    sections: [SEC0, ["gincanaSecGk1", "O topo"], ["gincanaSecGk2", "Barra"], ["gincanaSecGk3", "Blocos de gelo"], ["gincanaSecGk4", "Empurrão"], ["gincanaSecGk5", "Mar"], SEC6],
    tips: [
      ["gincanaHowGk1", "Cada segundo em pé dentro do anel do topo vale 1 ponto."],
      ["gincanaHowGk2", "Uma barra baixa gira no topo e acelera: pule quando ela vier."],
      ["gincanaHowGk3", "Na beira, blocos de gelo deslizam e empurram para o mar."],
      ["gincanaHowGk4", "Mergulhe em quem está no topo para tirar do lugar. O gelo escorrega!"],
      ["gincanaHowGk5", "Caiu no mar? Volta à beira, só perdeu tempo. Classifica a metade de cima."],
    ],
    event: ["gincanaEvGelo", "Rei do Iceberg"],
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
