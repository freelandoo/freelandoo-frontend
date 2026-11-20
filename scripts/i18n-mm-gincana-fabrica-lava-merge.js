// Meu Mundo 3D — Gincana (2026-11-20): Fábrica: o rio de fogo sobe em cada andar e engole os 2 últimos.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-fabrica-lava-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhFabricaPitch5": [
    "Pegue 10 engrenagens e o miolo vira um pula-pula para o andar de cima, com mais obstáculos. A lava sobe conforme o andar esvazia e engole os 2 últimos.",
    "Grab 10 gears and the center turns into a trampoline to the floor above, with more obstacles. The lava rises as the floor empties and swallows the last 2.",
    "Recoge 10 engranajes y el centro se vuelve una cama elástica hacia el piso de arriba, con más obstáculos. La lava sube a medida que el piso se vacía y se traga a los 2 últimos."
  ],
  "gincanaHowFg5c": [
    "Caiu na lava? Volta ao seu andar, só perdeu tempo. O rio de fogo sobe conforme o andar esvazia e engole os 2 últimos.",
    "Fell in the lava? You go back to your floor, you only lost time. The river of fire rises as the floor empties and swallows the last 2.",
    "¿Caíste en la lava? Vuelves a tu piso, solo perdiste tiempo. El río de fuego sube a medida que el piso se vacía y se traga a los 2 últimos."
  ],
  "gincanaSecFg5b": ["Lava", "Lava", "Lava"]
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
console.log(`i18n gincana fábrica lava: ${added} chaves adicionadas`)
