// mm3d-60k: lutas e minijogos dropam moedas (placa de drop + linha do recibo). Idempotente (fill-if-absent).
const fs = require("fs")
const path = require("path")
const ADD = {
  "pt-BR": { rewardCoins: "Moedas" },
  en: { rewardCoins: "Coins" },
  es: { rewardCoins: "Monedas" },
}
for (const [lang, keys] of Object.entries(ADD)) {
  const f = path.join(__dirname, "..", "messages", `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
}
