// Meu Mundo 3D — Gincana (2026-11-20): Comportas da Usina, a 2ª fase da Fábrica (Comportas).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-comportas-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  gincanaPhComportas: ["Comportas da Usina", "Power Plant Floodgates", "Compuertas de la Usina"],
  gincanaEvComportas: ["Comportas", "Floodgates", "Compuertas"],
  gincanaPhComportasPitch: [
    "A segunda corrida da Fábrica: fileiras de comportas de aço sobem e descem do chão. Passe pela que está embaixo, pule as baixas, atravesse a graxa e vença a fileira rápida.",
    "The Factory's second race: rows of steel floodgates rise and sink into the floor. Go through the one that is down, jump the low ones, cross the grease and beat the fast row.",
    "La segunda carrera de la Fábrica: filas de compuertas de acero suben y bajan del suelo. Pasa por la que está abajo, salta las bajas, cruza la grasa y vence la fila rápida.",
  ],
  gincanaSecCp1: ["Comportas em onda", "Floodgate wave", "Compuertas en ola"],
  gincanaSecCp2: ["Baixas e fundas", "Low and deep", "Bajas y hondas"],
  gincanaSecCp3: ["Funil", "Funnel", "Embudo"],
  gincanaSecCp4: ["Graxa", "Grease", "Grasa"],
  gincanaSecCp5: ["Fileira rápida", "Fast row", "Fila rápida"],
  gincanaHowCp1: [
    "As comportas sobem e descem em onda: a luz verde mostra a que está embaixo. Em cima de uma, você sobe junto.",
    "The floodgates rise and sink in a wave: the green light shows which one is down. Stand on one and you ride it up.",
    "Las compuertas suben y bajan en ola: la luz verde muestra cuál está abajo. Encima de una, subes con ella.",
  ],
  gincanaHowCp2: [
    "As baixas dá para pular; as fundas demoram para atravessar: entre logo que ela descer.",
    "The low ones can be jumped; the deep ones take longer to cross: go in as soon as it sinks.",
    "Las bajas se pueden saltar; las hondas tardan en cruzarse: entra apenas baje.",
  ],
  gincanaHowCp3: [
    "Muretas de cano fecham metade do funil: contorne ou pule. Depois, três comportas só.",
    "Pipe barriers close half of the funnel: go around or jump. Then, only three floodgates.",
    "Muretes de tubo cierran medio embudo: rodea o salta. Después, solo tres compuertas.",
  ],
  gincanaHowCp4: [
    "A graxa deixa a corrida na metade: as comportas daqui são lentas, mas você também.",
    "Grease halves your running speed: the floodgates here are slow, but so are you.",
    "La grasa reduce tu carrera a la mitad: las compuertas aquí son lentas, pero tú también.",
  ],
  gincanaHowCp5: [
    "A última fileira sobe e desce rápido: espere a sua e corra para a subida.",
    "The last row rises and sinks fast: wait for yours and run to the climb.",
    "La última fila sube y baja rápido: espera la tuya y corre a la subida.",
  ],
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
console.log(`i18n gincana comportas: ${added} chaves adicionadas`)
