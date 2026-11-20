// Meu Mundo 3D — Gincana, Feira do Centro (20/11, pedido do Alex): as duas esteiras do trecho 2 puxam para trás e
// as melancias ficam só na rampa. Namespace "MeuMundo". Idempotente (OVERRIDE: os valores mudaram).
// Rodar: node scripts/i18n-mm-gincana-feira-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const OVERRIDE = {
  gincanaPhFeiraPitch: [
    "Esteiras fortes na feira: a rampa desce contra você e as barracas soltam melancias. Depois, esteiras para trás, martelos e esteiras de lado.",
    "Strong conveyor belts at the market: the ramp runs down against you and the stalls drop watermelons. Then backward belts, hammers and sideways belts.",
    "Cintas fuertes en la feria: la rampa baja en tu contra y los puestos sueltan sandías. Después, cintas hacia atrás, martillos y cintas de lado.",
  ],
  gincanaSecFr2: ["Esteiras para trás", "Backward belts", "Cintas hacia atrás"],
  gincanaHowFr2: [
    "As duas esteiras puxam para trás: não pare de correr. As prensas atravessam de uma beira à outra.",
    "Both belts pull you back: keep running. The presses sweep from one edge to the other.",
    "Las dos cintas tiran hacia atrás: no dejes de correr. Las prensas cruzan de un borde al otro.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let changed = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n gincana feira: ${changed} chaves mudadas`)
