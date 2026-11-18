// Meu Mundo (2026-11-18): encaixes de runa na tela Equipamentos (Status).
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const UI = {
  "pt-BR": { eqRuneSockets: "Encaixes", eqRuneNone: "sem encaixe", eqRuneFree: "Encaixe livre", eqRuneRemove: "Tirar a runa", eqRuneNoneOwned: "Sem runas na mochila. Troque fichas dos minijogos ou lute nos Domínios." },
  en: { eqRuneSockets: "Sockets", eqRuneNone: "no socket", eqRuneFree: "Free socket", eqRuneRemove: "Remove the rune", eqRuneNoneOwned: "No runes in your bag. Trade minigame tokens or fight in the Domains." },
  es: { eqRuneSockets: "Engastes", eqRuneNone: "sin engaste", eqRuneFree: "Engaste libre", eqRuneRemove: "Quitar la runa", eqRuneNoneOwned: "Sin runas en la mochila. Cambia fichas de los minijuegos o lucha en los Dominios." },
}
for (const [lang, add] of Object.entries(UI)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
