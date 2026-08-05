// i18n do campo de % de afiliado por item (mig 192, slice P1/P2).
//
// O AffiliateOptInField era pt hardcoded — entra traduzido junto com o campo de
// porcentagem, pela regra do escoteiro. Namespace Account (é o que os 3
// chamadores já usam: modal de produto, modal de serviço e editor de curso).
//
// {min}/{max}/{default} são interpolados em JS no componente (o provider não
// interpola). Idempotente e não-destrutivo (fill-if-absent).
// Rodar: node scripts/i18n-affiliate-percent-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  affiliateOptInTitle: [
    "Aceito que afiliados vendam este item",
    "Allow affiliates to sell this item",
    "Acepto que afiliados vendan este artículo",
  ],
  affiliateOptInDesc: [
    "Afiliados divulgam e vendem por você. Você continua recebendo o mesmo valor — a comissão entra por cima do seu preço.",
    "Affiliates promote and sell for you. You still receive the same amount — the commission is added on top of your price.",
    "Los afiliados promocionan y venden por ti. Sigues recibiendo el mismo valor — la comisión se suma por encima de tu precio.",
  ],
  affiliatePercentLabel: [
    "Comissão que você oferece",
    "Commission you offer",
    "Comisión que ofreces",
  ],
  affiliatePercentHint: [
    "Entre {min}% e {max}% do seu valor. Vazio usa o padrão da plataforma ({default}%).",
    "Between {min}% and {max}% of your amount. Leave empty to use the platform default ({default}%).",
    "Entre {min}% y {max}% de tu valor. Vacío usa el estándar de la plataforma ({default}%).",
  ],
  affiliatePercentPlaceholder: [
    "Padrão ({default}%)",
    "Default ({default}%)",
    "Estándar ({default}%)",
  ],
  affiliatePercentInvalid: [
    "Use um valor entre {min}% e {max}%.",
    "Use a value between {min}% and {max}%.",
    "Usa un valor entre {min}% y {max}%.",
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
  added += mergeNamespace(json, "Account", ACCOUNT, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
