// features/meu-mundo/corrida/engine/ship-art.ts — CORRIDA (mm3d-49): a ARTE das naves da garagem.
//
// Os status (o que muda na corrida) ficam na regra (`SHIPS` em sim/race.ts,
// que o servidor também roda); aqui fica o que só o desenho usa: arquivos,
// bocais do fogo, cores do holograma da garagem e os nomes.
//
// Arquivos: `MEU MUNDO 3D/pipeline/corrida/build_carros_tripo.py` (as 5 do
// Tripo do Alex) e `build_nave_tripo.py` (a "brasa", do mm3d-41), depois o
// gltfpack (`-kn -vp 14 -vtf -vn 8`). Cada nave tem a CHEIA (a deste aparelho
// e a da garagem: textura 1024 + normal) e a LEVE (rivais: ~4 mil
// triângulos e a cor assada numa 512). Todas olham para −z no GLB; o jogo
// gira π. Os bocais foram medidos nas vistas de trás com grade.

import { SHIPS, type ShipStats } from "../sim/race"

export const SHIP_ASSETS = "/meu-mundo/corrida/"

/** Bocal no quadro da nave (bico em +z): x, y, z da boca, raio e comprimento relativo da chama. */
export type Nozzle = [number, number, number, number, number]

export interface ShipArt {
  id: string
  labelKey: string
  fallback: string
  taglineKey: string
  taglineFallback: string
  /** Arquivos (sem a pasta). `normal` só na cheia. */
  full: { glb: string; tex: string; normal?: string }
  lod: { glb: string; tex: string }
  nozzles: Nozzle[]
  /** Traseira (faíscas do turbo). */
  tailZ: number
  /** O vermelho da textura vira a cor da nave e o ciano acende (só a brasa, mm3d-41). */
  tint: boolean
  /** Luz própria da textura (0 = só a luz da cena): à noite a nave não some. */
  lift: number
  /** Holograma da garagem. */
  holo: { color: string; accent: string }
}

const m49 = (id: string) => ({
  full: { glb: `nave-${id}-m49.glb`, tex: `nave-${id}-m49.jpg`, normal: `nave-${id}-m49-n.jpg` },
  lod: { glb: `nave-${id}-m49-lod.glb`, tex: `nave-${id}-m49-lod.jpg` },
})

export const SHIP_ART: readonly ShipArt[] = [
  {
    id: "brasa",
    labelKey: "corridaShipBrasa",
    fallback: "Brasa",
    taglineKey: "corridaShipBrasaLine",
    taglineFallback: "A nave da casa. Equilibrada em tudo.",
    full: { glb: "nave-brasa-m49.glb", tex: "nave-brasa-m49.jpg" },
    lod: { glb: "nave-brasa-m49-lod.glb", tex: "nave-brasa-m49-lod.jpg" },
    // mm3d-41: os do meio ficam MAIS BAIXOS que os grandes
    nozzles: [
      [-1.026, 0.535, -1.76, 0.16, 1],
      [1.026, 0.535, -1.76, 0.16, 1],
      [-0.354, 0.37, -1.76, 0.11, 0.72],
      [0.354, 0.37, -1.76, 0.11, 0.72],
    ],
    tailZ: -1.9,
    tint: true,
    lift: 0.22,
    holo: { color: "#ff4a2a", accent: "#ffd9c2" },
  },
  {
    id: "corisco",
    labelKey: "corridaShipCorisco",
    fallback: "Corisco",
    taglineKey: "corridaShipCoriscoLine",
    taglineFallback: "A mais rápida na reta. Pede braço nas curvas.",
    ...m49("corisco"),
    nozzles: [
      [-0.43, 0.44, -2.0, 0.13, 1],
      [0.43, 0.44, -2.0, 0.13, 1],
    ],
    tailZ: -2.1,
    tint: false,
    lift: 0.22,
    holo: { color: "#3aa0ff", accent: "#d6ecff" },
  },
  {
    id: "rubi",
    labelKey: "corridaShipRubi",
    fallback: "Rubi",
    taglineKey: "corridaShipRubiLine",
    taglineFallback: "Arrancada forte. O turbo acaba antes.",
    ...m49("rubi"),
    nozzles: [
      [-0.64, 0.66, -2.0, 0.1, 0.9],
      [0.64, 0.66, -2.0, 0.1, 0.9],
    ],
    tailZ: -2.1,
    tint: false,
    lift: 0.22,
    holo: { color: "#ff2b3a", accent: "#ffd1d6" },
  },
  {
    id: "aurora",
    labelKey: "corridaShipAurora",
    fallback: "Aurora",
    taglineKey: "corridaShipAuroraLine",
    taglineFallback: "Faz qualquer curva. Um pouco menos de reta.",
    ...m49("aurora"),
    nozzles: [
      [-0.55, 0.42, -2.0, 0.14, 1],
      [0.55, 0.42, -2.0, 0.14, 1],
    ],
    tailZ: -2.1,
    tint: false,
    lift: 0.16,
    holo: { color: "#9b5bff", accent: "#e6d9ff" },
  },
  {
    id: "tita",
    labelKey: "corridaShipTita",
    fallback: "Titã",
    taglineKey: "corridaShipTitaLine",
    taglineFallback: "Pesada e de turbo longo. Curva aberta.",
    ...m49("tita"),
    nozzles: [
      [-0.62, 0.48, -2.0, 0.14, 1],
      [-0.31, 0.48, -2.0, 0.13, 0.9],
      [0.31, 0.48, -2.0, 0.13, 0.9],
      [0.62, 0.48, -2.0, 0.14, 1],
    ],
    tailZ: -2.1,
    tint: false,
    lift: 0.22,
    holo: { color: "#ff7a2f", accent: "#ffe0c8" },
  },
  {
    id: "vespa",
    labelKey: "corridaShipVespa",
    fallback: "Vespa",
    taglineKey: "corridaShipVespaLine",
    taglineFallback: "Nervosa: rápida e esperta. Turbo curto.",
    ...m49("vespa"),
    nozzles: [
      [-1.17, 0.44, -1.85, 0.09, 0.75],
      [1.17, 0.44, -1.85, 0.09, 0.75],
      [0, 0.52, -1.9, 0.12, 1],
    ],
    tailZ: -1.95,
    tint: false,
    lift: 0.24,
    holo: { color: "#b6ff2e", accent: "#efffd1" },
  },
]

export function shipArt(id: string | null | undefined): ShipArt {
  return SHIP_ART.find((s) => s.id === id) ?? SHIP_ART[0]
}

/** Status na escala da garagem (1–10; 6 = a nave padrão; cada 2,5% = 1 ponto). */
export function statBars(s: ShipStats): { key: keyof ShipStats; value: number }[] {
  const bar = (m: number) => Math.max(1, Math.min(10, Math.round(6 + (m - 1) * 40)))
  return (["speed", "accel", "turn", "turbo"] as const).map((key) => ({ key, value: bar(s[key]) }))
}

// arte e regra andam juntas: nave nova entra nos dois lugares
if (process.env.NODE_ENV !== "production" && SHIP_ART.length !== SHIPS.length) {
  console.warn("[corrida] SHIP_ART e SHIPS fora de sincronia")
}
