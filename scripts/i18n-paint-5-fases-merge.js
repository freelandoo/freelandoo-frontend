// 2026-11-21: as 5 fases dos Domínios no Paint (Cânion, Gelo, Orbital, Lua, Usina) — os cartões da tela
// SELECIONAR MAPA (features/meu-mundo/paint/engine/paint-map-art.ts). Plano: MEU MUNDO 3D/planos/2026-11-21-paint-5-fases.md
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const KEYS = {
  "pt-BR": {
    paintMapCanionName: "Cânion das Tempestades",
    paintMapCanionBiome: "Mesas de arenito no céu de Zéphyra",
    paintMapCanionDesc: "Mesas de arenito, pontes de tábua e o pináculo de rocha do meio, subindo em espiral até a agulha de raio.",
    paintMapCanionH1: "Pináculo com saliências em espiral",
    paintMapCanionH2: "Moinhos e pontes de tábua",
    paintMapCanionH3: "Piões de pedra flutuando",
    paintMapCanionPlayers: "Ótimo para 1 × 1 e 2 × 2",
    paintMapGeloName: "Farol do Mar de Gelo",
    paintMapGeloBiome: "Mar congelado de Marú",
    paintMapGeloDesc: "Banquisas, icebergs e navios presos no gelo; no meio, o farol com blocos de gelo subindo até a lanterna dos portais.",
    paintMapGeloH1: "Farol com blocos em volta",
    paintMapGeloH2: "Convés de navio preso no gelo",
    paintMapGeloH3: "Icebergs triangulares",
    paintMapOrbitalName: "Hélices do Prisma",
    paintMapOrbitalBiome: "Cidade Orbital de vidro colorido",
    paintMapOrbitalDesc: "Escada sem chão, as pás da grande hélice em volta do eixo e a coroa do Palácio Prisma, a casa de Íris.",
    paintMapOrbitalH1: "Escada de degraus soltos",
    paintMapOrbitalH2: "Pás da hélice em espiral",
    paintMapOrbitalH3: "Vidro colorido e o Palácio Prisma",
    paintMapOrbitalPlayers: "Ótimo para 3 × 3",
    paintMapLuaName: "Serraria da Lua",
    paintMapLuaBiome: "Floresta de troncos de prata, de noite",
    paintMapLuaDesc: "Tocos gigantes, escada de toras e cogumelos em volta do tronco de prata, debaixo da lua parada de Noctis.",
    paintMapLuaH1: "Cogumelos em volta do tronco",
    paintMapLuaH2: "Escada de toras que se sobe andando",
    paintMapLuaH3: "Noite de lua cheia",
    paintMapUsinaName: "Usina das Comportas",
    paintMapUsinaBiome: "Barragem de bronze de Aeryn",
    paintMapUsinaDesc: "A barragem em zigue-zague, o conduto até o meio, tanques de bronze e a coroa da turbina; lá embaixo, a represa.",
    paintMapUsinaH1: "Degraus da barragem em zigue-zague",
    paintMapUsinaH2: "Comportas soltando água",
    paintMapUsinaH3: "Tanques de bronze até a turbina",
    paintMapUsinaPlayers: "Ótimo para 2 × 2",
  },
  en: {
    paintMapCanionName: "Storm Canyon",
    paintMapCanionBiome: "Sandstone mesas in Zéphyra's sky",
    paintMapCanionDesc: "Sandstone mesas, plank bridges and the rock spire in the middle, climbing in a spiral up to the lightning needle.",
    paintMapCanionH1: "Spire with spiral ledges",
    paintMapCanionH2: "Windmills and plank bridges",
    paintMapCanionH3: "Floating stone tops",
    paintMapCanionPlayers: "Great for 1 × 1 and 2 × 2",
    paintMapGeloName: "Ice Sea Lighthouse",
    paintMapGeloBiome: "Marú's frozen sea",
    paintMapGeloDesc: "Ice floes, icebergs and ships trapped in the ice; in the middle, the lighthouse with ice blocks climbing up to the portal lantern.",
    paintMapGeloH1: "Lighthouse ringed by blocks",
    paintMapGeloH2: "Deck of a ship stuck in the ice",
    paintMapGeloH3: "Triangular icebergs",
    paintMapOrbitalName: "Prism Propellers",
    paintMapOrbitalBiome: "Orbital City of colored glass",
    paintMapOrbitalDesc: "A floorless staircase, the blades of the great propeller around the axle and the crown of the Prism Palace, Íris's home.",
    paintMapOrbitalH1: "Staircase of loose steps",
    paintMapOrbitalH2: "Propeller blades in a spiral",
    paintMapOrbitalH3: "Colored glass and the Prism Palace",
    paintMapOrbitalPlayers: "Great for 3 × 3",
    paintMapLuaName: "Moon Sawmill",
    paintMapLuaBiome: "Forest of silver trunks, at night",
    paintMapLuaDesc: "Giant stumps, a log staircase and mushrooms around the silver trunk, under Noctis's still moon.",
    paintMapLuaH1: "Mushrooms around the trunk",
    paintMapLuaH2: "Log stairs you can walk up",
    paintMapLuaH3: "Full-moon night",
    paintMapUsinaName: "Floodgate Power Plant",
    paintMapUsinaBiome: "Aeryn's bronze dam",
    paintMapUsinaDesc: "The zigzag dam, the penstock to the middle, bronze tanks and the turbine crown; down below, the reservoir.",
    paintMapUsinaH1: "Zigzag dam steps",
    paintMapUsinaH2: "Floodgates releasing water",
    paintMapUsinaH3: "Bronze tanks up to the turbine",
    paintMapUsinaPlayers: "Great for 2 × 2",
  },
  es: {
    paintMapCanionName: "Cañón de las Tormentas",
    paintMapCanionBiome: "Mesetas de arenisca en el cielo de Zéphyra",
    paintMapCanionDesc: "Mesetas de arenisca, puentes de tablas y el pináculo de roca del medio, subiendo en espiral hasta la aguja del rayo.",
    paintMapCanionH1: "Pináculo con salientes en espiral",
    paintMapCanionH2: "Molinos y puentes de tablas",
    paintMapCanionH3: "Peonzas de piedra flotando",
    paintMapCanionPlayers: "Ideal para 1 × 1 y 2 × 2",
    paintMapGeloName: "Faro del Mar de Hielo",
    paintMapGeloBiome: "El mar congelado de Marú",
    paintMapGeloDesc: "Témpanos, icebergs y barcos atrapados en el hielo; en el medio, el faro con bloques de hielo subiendo hasta la linterna de los portales.",
    paintMapGeloH1: "Faro rodeado de bloques",
    paintMapGeloH2: "Cubierta de un barco atrapado en el hielo",
    paintMapGeloH3: "Icebergs triangulares",
    paintMapOrbitalName: "Hélices del Prisma",
    paintMapOrbitalBiome: "Ciudad Orbital de vidrio de colores",
    paintMapOrbitalDesc: "Una escalera sin suelo, las palas de la gran hélice alrededor del eje y la corona del Palacio Prisma, la casa de Íris.",
    paintMapOrbitalH1: "Escalera de peldaños sueltos",
    paintMapOrbitalH2: "Palas de la hélice en espiral",
    paintMapOrbitalH3: "Vidrio de colores y el Palacio Prisma",
    paintMapOrbitalPlayers: "Ideal para 3 × 3",
    paintMapLuaName: "Aserradero de la Luna",
    paintMapLuaBiome: "Bosque de troncos de plata, de noche",
    paintMapLuaDesc: "Tocones gigantes, escalera de troncos y hongos alrededor del tronco de plata, bajo la luna quieta de Noctis.",
    paintMapLuaH1: "Hongos alrededor del tronco",
    paintMapLuaH2: "Escalera de troncos que se sube caminando",
    paintMapLuaH3: "Noche de luna llena",
    paintMapUsinaName: "Central de las Compuertas",
    paintMapUsinaBiome: "La represa de bronce de Aeryn",
    paintMapUsinaDesc: "La presa en zigzag, el conducto hasta el medio, tanques de bronce y la corona de la turbina; abajo, el embalse.",
    paintMapUsinaH1: "Escalones de la presa en zigzag",
    paintMapUsinaH2: "Compuertas soltando agua",
    paintMapUsinaH3: "Tanques de bronce hasta la turbina",
    paintMapUsinaPlayers: "Ideal para 2 × 2",
  },
}

for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] === undefined) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "paint 5 fases +", n)
}
