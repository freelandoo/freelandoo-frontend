// Segurança A2-06 (back mig 452): repasse PAGO que sofre estorno vira "devido" — quem recebeu deve
// o valor de volta. Rótulo nas telas de repasse (agenda, loja) e na do clã.
// Namespaces "Payments" e "Account". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-payout-devido-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ADD = {
  Payments: {
    balanceOwed: ["Estornado após o repasse (devido)", "Refunded after payout (owed)", "Reembolsado tras la transferencia (adeudado)"],
  },
  Account: {
    payoutStatusOwed: ["Estornado após o repasse (devido)", "Refunded after payout (owed)", "Reembolsado tras la transferencia (adeudado)"],
  },
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, keys] of Object.entries(ADD)) {
    json[ns] = json[ns] || {}
    for (const [key, vals] of Object.entries(keys)) {
      if (json[ns][key] === undefined) {
        json[ns][key] = vals[i]
        added++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n payout devido: ${added} chaves adicionadas`)
