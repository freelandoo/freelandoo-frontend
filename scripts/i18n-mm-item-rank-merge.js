// Meu Mundo (2026-11-17): CLASSE DE RARIDADE dos itens — E · D · C · B · A · S · SS · SSR · Lendária · Divina.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const LETTERS = ["E", "D", "C", "B", "A", "S", "SS", "SSR"]
const UI = {
  "pt-BR": { rankLegendary: "Lendária", rankDivine: "Divina", rankClassOf: "Classe {r}" },
  en: { rankLegendary: "Legendary", rankDivine: "Divine", rankClassOf: "Class {r}" },
  es: { rankLegendary: "Legendaria", rankDivine: "Divina", rankClassOf: "Clase {r}" },
}
for (const [lang, ui] of Object.entries(UI)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  // as letras são iguais nas três línguas
  const add = { ...Object.fromEntries(LETTERS.map((l) => ["rank" + l, l])), ...ui }
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
