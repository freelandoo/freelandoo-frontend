// Meu Mundo 3D — Gincana (2026-11-20): Esteira do Alto-Forno, a 2ª fase da Forja (esteira + bolas que quicam).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-altoforno-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhAltoForno": [
    "Esteira do Alto-Forno",
    "Blast Furnace Conveyor",
    "Cinta del Alto Horno"
  ],
  "gincanaEvAltoForno": [
    "Esteira do Alto-Forno",
    "Blast Furnace Conveyor",
    "Cinta del Alto Horno"
  ],
  "gincanaPhAltoFornoPitch": [
    "A segunda corrida da Forja: suba a esteira de ferro que puxa para trás enquanto o canhão do alto-forno cospe bolas em brasa que quicam ladeira abaixo.",
    "The Forge's second race: climb the iron conveyor that pulls you back while the furnace cannon spits glowing balls that bounce down the slope.",
    "La segunda carrera de la Forja: sube la cinta de hierro que te arrastra hacia atrás mientras el cañón del alto horno escupe bolas al rojo que rebotan cuesta abajo."
  ],
  "gincanaSecAf1": [
    "Pátio da fundição",
    "Foundry yard",
    "Patio de la fundición"
  ],
  "gincanaSecAf2": [
    "Esteira",
    "Conveyor",
    "Cinta"
  ],
  "gincanaSecAf3": [
    "Boca do forno",
    "Furnace mouth",
    "Boca del horno"
  ],
  "gincanaSecAf4": [
    "Barra de fogo",
    "Fire bar",
    "Barra de fuego"
  ],
  "gincanaSecAf5": [
    "Última esteira",
    "Last conveyor",
    "Última cinta"
  ],
  "gincanaHowAf1": [
    "As barras de fogo do pátio giram baixo: pule na hora.",
    "The yard's fire bars spin low: jump at the right time.",
    "Las barras de fuego del patio giran bajo: salta a tiempo."
  ],
  "gincanaHowAf2": [
    "A esteira puxa você para trás: não pare de correr.",
    "The conveyor pulls you back: keep running.",
    "La cinta te arrastra hacia atrás: no dejes de correr."
  ],
  "gincanaHowAf3": [
    "As bolas quicam e vão de lado. No alto do quique dá para passar por baixo.",
    "The balls bounce and drift sideways. At the top of a bounce you can run under them.",
    "Las bolas rebotan y se van de lado. En lo alto del rebote puedes pasar por debajo."
  ],
  "gincanaHowAf4": [
    "Lá em cima, a barra de fogo gira: pule quando ela chegar.",
    "Up top, the fire bar spins: jump when it comes.",
    "Arriba, la barra de fuego gira: salta cuando llegue."
  ],
  "gincanaHowAf5": [
    "A última esteira é mais fraca: corra até a linha.",
    "The last conveyor is weaker: run to the line.",
    "La última cinta es más débil: corre hasta la línea."
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
console.log(`i18n gincana altoforno: ${added} chaves adicionadas`)
