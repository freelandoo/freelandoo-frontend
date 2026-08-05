// i18n do selo do vínculo vitalício no checkout (slice V3).
// Namespace Checkout. Idempotente e não-destrutivo (fill-if-absent).
// {who} e {value} são interpolados em JS — o provider não interpola.
// Rodar: node scripts/i18n-referral-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const CHECKOUT = {
  referralBadgeTitle: [
    "Indicado por @{who}",
    "Referred by @{who}",
    "Recomendado por @{who}",
  ],
  referralBadgeDiscount: [
    "Seu desconto de {value} já está aplicado — e vale em toda compra, para sempre.",
    "Your {value} discount is already applied — and it applies to every purchase, forever.",
    "Tu descuento de {value} ya está aplicado — y vale en cada compra, para siempre.",
  ],
  referralBadgeNoDiscount: [
    "Seu vínculo está ativo nesta conta.",
    "Your referral link is active on this account.",
    "Tu vínculo está activo en esta cuenta.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "Checkout", CHECKOUT, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
