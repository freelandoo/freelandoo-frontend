// Namespace "Account" — a página Parental com a pele de jogo (2026-09-24).
// Idempotente, fill-if-absent. Rodar: node scripts/i18n-parental-play-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const GROUPS = {
  Account: {
    parentalLinkedCount: ["{n} vinculados", "{n} linked", "{n} vinculados"],
    parentalSubtitlePlay: [
      "Os seus pequenos jogadores num lugar só: vincule, libere o que pode e acompanhe as conversas.",
      "Your little players in one place: link them, unlock what's allowed and follow their conversations.",
      "Tus pequeños jugadores en un solo lugar: vincúlalos, libera lo permitido y sigue sus conversaciones.",
    ],
  },
}

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
