// i18n da seção "Meus indicados" do painel de afiliado (slice X3).
// Namespace Account. Idempotente e não-destrutivo (fill-if-absent).
// {date} é interpolado em JS — o provider não interpola.
// Rodar: node scripts/i18n-my-referrals-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  myReferralsTitle: ["Meus indicados", "My referrals", "Mis referidos"],
  myReferralsDesc: [
    "Quem usou seu cupom numa compra da plataforma fica vinculado a você para sempre — toda compra futura dessa pessoa gera comissão.",
    "Anyone who used your coupon on a platform purchase is linked to you forever — every future purchase they make earns you commission.",
    "Quien usó tu cupón en una compra de la plataforma queda vinculado a ti para siempre — cada compra futura de esa persona genera comisión.",
  ],
  myReferralsEmpty: [
    "Ninguém vinculado ainda. Compartilhe seu cupom: o primeiro que comprar algo da plataforma por ele fica seu para sempre.",
    "Nobody linked yet. Share your coupon: the first person to buy something from the platform with it is yours forever.",
    "Nadie vinculado todavía. Comparte tu cupón: la primera persona que compre algo de la plataforma con él es tuya para siempre.",
  ],
  myReferralsCount: ["Vinculados", "Linked", "Vinculados"],
  myReferralsRecurring: [
    "Comissão por vínculo (30 dias)",
    "Referral commission (30 days)",
    "Comisión por vínculo (30 días)",
  ],
  myReferralsSince: ["desde {date}", "since {date}", "desde {date}"],
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
