// Meu Mundo 3D — Gincana (2026-11-20): Estaleiro do Quebra-Gelo, a 3ª fase do Mar de Gelo (banquisas com barra, hélices gigantes em pé).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-estaleiro-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhEstaleiro": [
    "Estaleiro do Quebra-Gelo",
    "Icebreaker Shipyard",
    "Astillero del Rompehielos"
  ],
  "gincanaEvEstaleiro": [
    "Hélices de Pé",
    "Standing Propellers",
    "Hélices de Pie"
  ],
  "gincanaPhEstaleiroPitch": [
    "A terceira corrida do Mar de Gelo, no estaleiro dos quebra-gelos: banquisas com a barra que varre e as hélices gigantes dos navios girando de pé. Passe pelo vão entre as pás.",
    "The Ice Sea's third race, at the icebreaker shipyard: ice floes with a sweeping bar and the ships' giant propellers spinning upright. Run through the gap between the blades.",
    "La tercera carrera del Mar de Hielo, en el astillero de los rompehielos: témpanos con la barra que barre y las hélices gigantes de los barcos girando de pie. Pasa por el hueco entre las palas."
  ],
  "gincanaSecEs1": [
    "Banquisas",
    "Ice floes",
    "Témpanos"
  ],
  "gincanaSecEs2": [
    "Cais das hélices",
    "Propeller pier",
    "Muelle de las hélices"
  ],
  "gincanaSecEs3": [
    "Pátio",
    "Yard",
    "Patio"
  ],
  "gincanaSecEs4": [
    "Dique seco",
    "Dry dock",
    "Dique seco"
  ],
  "gincanaSecEs5": [
    "Hélice gigante",
    "Giant propeller",
    "Hélice gigante"
  ],
  "gincanaHowEs1": [
    "Nas banquisas a barra de proa varre em roda: pule quando ela chegar.",
    "On the ice floes the bow bar sweeps around: jump when it reaches you.",
    "En los témpanos la barra de proa barre en círculo: salta cuando llegue."
  ],
  "gincanaHowEs2": [
    "As hélices giram de pé, de frente para você: corra pelo vão logo depois que a pá passar no chão.",
    "The propellers spin upright, facing you: run through the gap right after a blade sweeps the floor.",
    "Las hélices giran de pie, de frente a ti: corre por el hueco justo después de que la pala pase por el suelo."
  ],
  "gincanaHowEs3": [
    "No pátio as hélices ficam lado a lado em duas fileiras: escolha o vão e a hora.",
    "In the yard the propellers stand side by side in two rows: pick your gap and your moment.",
    "En el patio las hélices están lado a lado en dos filas: elige el hueco y el momento."
  ],
  "gincanaHowEs4": [
    "A pá derruba para o lado do giro e joga para trás: perto da ponta o vão abre antes.",
    "A blade knocks you toward its spin and back: near the tip the gap opens sooner.",
    "La pala te tira hacia el lado del giro y hacia atrás: cerca de la punta el hueco se abre antes."
  ],
  "gincanaHowEs5": [
    "Na subida do dique seco, a hélice gigante atravessada. Depois é a chegada.",
    "On the climb out of the dry dock, the giant propeller blocks the way. Then the finish.",
    "En la subida del dique seco, la hélice gigante atravesada. Después, la meta."
  ],
  "gincanaHitBlade": [
    "Pancada da pá!",
    "Hit by a blade!",
    "¡Golpe de la pala!"
  ]
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n gincana estaleiro: ${added} chaves adicionadas`)
