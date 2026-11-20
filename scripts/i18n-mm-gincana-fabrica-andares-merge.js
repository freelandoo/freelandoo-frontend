// Meu Mundo 3D — Gincana (2026-11-20): Fábrica em andares (10 engrenagens → pula-pula → andar de cima; 2 ficam fora).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-fabrica-andares-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhFabricaPitch4": [
    "Pegue 10 engrenagens e o miolo vira um pula-pula para o andar de cima, com mais obstáculos. Em cada andar, os 2 últimos ficam fora.",
    "Grab 10 gears and the center turns into a trampoline to the floor above, with more obstacles. On each floor, the last 2 are out.",
    "Recoge 10 engranajes y el centro se vuelve una cama elástica hacia el piso de arriba, con más obstáculos. En cada piso, los 2 últimos quedan fuera."
  ],
  "gincanaHowFgAndar": [
    "Com 10 engrenagens no andar, suba no miolo: ele vira pula-pula e te joga no andar de cima.",
    "With 10 gears on the floor, step on the center: it turns into a trampoline and throws you to the floor above.",
    "Con 10 engranajes en el piso, sube al centro: se vuelve una cama elástica y te lanza al piso de arriba."
  ],
  "gincanaHowFg5b": [
    "Caiu no óleo? Volta ao seu andar, só perdeu tempo. Os 2 últimos de cada andar ficam fora.",
    "Fell in the oil? You go back to your floor, you only lost time. The last 2 on each floor are out.",
    "¿Caíste en el aceite? Vuelves a tu piso, solo perdiste tiempo. Los 2 últimos de cada piso quedan fuera."
  ],
  "gincanaFloorGears": [
    "Andar {f} · {n}/{g} engrenagens",
    "Floor {f} · {n}/{g} gears",
    "Piso {f} · {n}/{g} engranajes"
  ],
  "gincanaFloorJump": [
    "Andar {f}: pule no miolo!",
    "Floor {f}: jump on the center!",
    "Piso {f}: ¡salta al centro!"
  ],
  "gincanaFloorTop": [
    "No topo!",
    "At the top!",
    "¡En la cima!"
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
console.log(`i18n gincana fábrica andares: ${added} chaves adicionadas`)
