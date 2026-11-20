// Meu Mundo 3D — Gincana (2026-11-20): Trilha dos Moinhos, a 2ª fase do Cânion (moendas, blocos, pás e cata-ventos).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-moinhos-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhMoinhos": [
    "Trilha dos Moinhos",
    "Mill Trail",
    "Sendero de los Molinos"
  ],
  "gincanaEvMoinhos": [
    "Corrida dos Moinhos",
    "Mill Race",
    "Carrera de los Molinos"
  ],
  "gincanaPhMoinhosPitch": [
    "Moendas de pedra rolando, blocos de arenito que varrem a trilha, pás de moinho sobre dois discos e um campo de cata-ventos. Chegue antes da vaga fechar.",
    "Rolling millstones, sandstone blocks sweeping the trail, mill blades over two discs and a field of windmills. Make it before the spots run out.",
    "Muelas de piedra rodando, bloques de arenisca que barren el sendero, aspas de molino sobre dos discos y un campo de molinillos. Llega antes de que se acaben los cupos."
  ],
  "gincanaSecMo1": [
    "Moendas",
    "Millstones",
    "Muelas"
  ],
  "gincanaSecMo2": [
    "Blocos",
    "Blocks",
    "Bloques"
  ],
  "gincanaSecMo3": [
    "Pás",
    "Blades",
    "Aspas"
  ],
  "gincanaSecMo4": [
    "Cata-ventos",
    "Windmills",
    "Molinillos"
  ],
  "gincanaSecMo5": [
    "Subida",
    "Climb",
    "Subida"
  ],
  "gincanaHowMo1": [
    "Ande no vão entre as moendas: o rolo gira e joga você para o lado.",
    "Run in the gap between the millstones: the roller spins and throws you aside.",
    "Corre por el hueco entre las muelas: el rodillo gira y te lanza a un lado."
  ],
  "gincanaHowMo2": [
    "Os blocos vão e voltam: passe logo depois que um deles cruzar.",
    "The blocks slide back and forth: go right after one crosses.",
    "Los bloques van y vuelven: pasa justo después de que uno cruce."
  ],
  "gincanaHowMo3": [
    "Atravesse o disco longe do eixo e pule a pá quando ela chegar.",
    "Cross the disc away from the axle and jump the blade when it comes.",
    "Cruza el disco lejos del eje y salta el aspa cuando llegue."
  ],
  "gincanaHowMo4": [
    "Os cata-ventos giram cada um para um lado: procure o vão.",
    "Each windmill spins its own way: look for the gap.",
    "Cada molinillo gira hacia un lado: busca el hueco."
  ],
  "gincanaHowMo5": [
    "As pedras descem rolando: troque de faixa cedo.",
    "Rocks roll down: switch lanes early.",
    "Las piedras bajan rodando: cambia de carril pronto."
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
console.log(`i18n gincana moinhos: ${added} chaves adicionadas`)
