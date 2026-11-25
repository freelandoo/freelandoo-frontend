// 24/11/2026 (Alex): no Arsenal, Davi só vende cajados e Dora (a vampira) só espadas, sem abas; o Forjador vende as
// proteções (aba "Proteções" na Forja, ao lado de Refinar e Forja). Fill-if-absent no namespace MeuMundo. Idempotente.
// node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": { pvBuySwords: "Comprar espadas", pvBuyStaffs: "Comprar cajados", forgeShopTab: "Proteções", forgeShopTitle: "Venda de proteções" },
  en: { pvBuySwords: "Buy swords", pvBuyStaffs: "Buy staffs", forgeShopTab: "Protections", forgeShopTitle: "Protections for sale" },
  es: { pvBuySwords: "Comprar espadas", pvBuyStaffs: "Comprar bastones", forgeShopTab: "Protecciones", forgeShopTitle: "Venta de protecciones" },
}
for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] === undefined) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "vendedores +", n)
}
