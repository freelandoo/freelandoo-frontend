// Projeto B do Meu Mundo (interface, personagens e acabamento dos minijogos), 2026-11-14.
// Fatia 2: a seta do portal na HUD do Paint (features/meu-mundo/paint/ui/paint-view.tsx).
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const KEYS = {
  "pt-BR": {
    paintGoalAhead: "em frente",
    paintGoalBehind: "atrás de você",
    paintGoalRight: "à direita",
    paintGoalLeft: "à esquerda",
    paintGoalUp: "suba {n} m",
    paintGoalDown: "desça {n} m",
    paintGoalDist: "{n} m",
    paintGoalAria: "Portal {side}, a {n} m",
  },
  en: {
    paintGoalAhead: "ahead",
    paintGoalBehind: "behind you",
    paintGoalRight: "to the right",
    paintGoalLeft: "to the left",
    paintGoalUp: "climb {n} m",
    paintGoalDown: "go down {n} m",
    paintGoalDist: "{n} m",
    paintGoalAria: "Portal {side}, {n} m away",
  },
  es: {
    paintGoalAhead: "al frente",
    paintGoalBehind: "detrás de ti",
    paintGoalRight: "a la derecha",
    paintGoalLeft: "a la izquierda",
    paintGoalUp: "sube {n} m",
    paintGoalDown: "baja {n} m",
    paintGoalDist: "{n} m",
    paintGoalAria: "Portal {side}, a {n} m",
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
  console.log(loc, "projeto B +", n)
}
