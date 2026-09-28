// Monetização de 2026-09-28: taxa da Freelandoo no delivery (mig 267), selo
// verificado (mig 268) e relatório de mercado local. Idempotente, fill-if-absent.
//   node scripts/i18n-monetization-0928-merge.js
const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", "messages")

const NS = {
  Community: {
    delPlatformFee: ["· {v} ficam com a Freelandoo", "· {v} goes to Freelandoo", "· {v} queda para Freelandoo"],
    listBillToPlatform: [
      "A mensalidade é paga à Freelandoo, não ao líder da comunidade.",
      "The monthly fee is paid to Freelandoo, not to the community leader.",
      "La mensualidad se paga a Freelandoo, no al líder de la comunidad.",
    ],
  },
}

function load(f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }
function save(f, o) { fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + "\n", "utf8") }
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(NS)) {
    if (!d[ns]) d[ns] = {}
    for (const [k, vals] of Object.entries(keys)) if (!(k in d[ns])) { d[ns][k] = vals[idx]; added++ }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
