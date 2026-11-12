// Página Equipamentos do STATUS (2026-11-12): features/meu-mundo/ui/status/equip-page.tsx.
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const KEYS = {
  "pt-BR": {
    stPageEquip: "Equipamentos",
    eqHint: "Toque numa casa em volta do personagem para escolher a peça.",
    eqTakeOff: "Tirar",
    eqClose: "Fechar a lista",
    eqNone: "Você ainda não tem peça para esta casa.",
    eqElsewhere: "com outro personagem",
    eqWorn: "Vestindo",
    eqEquip: "Equipar",
  },
  en: {
    stPageEquip: "Equipment",
    eqHint: "Tap a slot around the character to choose a piece.",
    eqTakeOff: "Remove",
    eqClose: "Close the list",
    eqNone: "You don't have a piece for this slot yet.",
    eqElsewhere: "on another character",
    eqWorn: "Equipped",
    eqEquip: "Equip",
  },
  es: {
    stPageEquip: "Equipamiento",
    eqHint: "Toca una casilla alrededor del personaje para elegir la pieza.",
    eqTakeOff: "Quitar",
    eqClose: "Cerrar la lista",
    eqNone: "Aún no tienes una pieza para esta casilla.",
    eqElsewhere: "con otro personaje",
    eqWorn: "Equipado",
    eqEquip: "Equipar",
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
  console.log(loc, "equipamentos +", n)
}
