// Alterações de monetização de 2026-09-27 (bolsa no cartão, vitrine em grade,
// aba Produtos do negócio, delivery por peso). Idempotente, fill-if-absent.
//   node scripts/i18n-monetization-0927-merge.js
const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", "messages")

const NS = {
  Vaquinha: {
    sponsorCardNote: [
      "Pagamento recorrente no cartão de crédito: o valor é cobrado automaticamente todo mês, até você cancelar.",
      "Recurring credit card payment: the amount is charged automatically every month until you cancel.",
      "Pago recurrente con tarjeta de crédito: el monto se cobra automáticamente cada mes hasta que canceles.",
    ],
    sponsorPayCard: ["Assinar no cartão", "Subscribe with card", "Suscribirse con tarjeta"],
    sponsorCardChip: ["Cartão", "Card", "Tarjeta"],
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
