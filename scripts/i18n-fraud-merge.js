// i18n do gate antifraude no destino de repasse (mig 201). Só o que o USUÁRIO
// vê: o painel /administracao/fraude é admin interno e, por convenção do
// projeto, NÃO traduz (pt-only).
// Idempotente. Rodar: node scripts/i18n-fraud-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT_NEW = {
  payoutOwnershipHint: [
    "O CPF do recebedor precisa ser o mesmo CPF cadastrado na sua conta.",
    "The payee's CPF must be the same CPF registered on your account.",
    "El CPF del receptor debe ser el mismo CPF registrado en tu cuenta.",
  ],
  pixSaveFail: [
    "Não foi possível salvar os dados de recebimento.",
    "Could not save your payout details.",
    "No fue posible guardar los datos de cobro.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]

function fillIfAbsent(json, ns, keys, localeIndex) {
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
  const added = fillIfAbsent(json, "Account", ACCOUNT_NEW, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
