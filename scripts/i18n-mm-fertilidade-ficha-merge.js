// Namespace "MeuMundo" — 2026-11-25: a fertilidade virou barra da Ficha do STATUS
// (a página Alma saiu). Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-fertilidade-ficha-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  sgFertWhere: [
    "A chance de ter um filho: é ela que decide se a próxima geração vem.",
    "The chance of having a child: it decides whether the next generation comes.",
    "La probabilidad de tener un hijo: decide si llega la próxima generación.",
  ],
}

const GROUPS = { MeuMundo: MEU_MUNDO }

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
