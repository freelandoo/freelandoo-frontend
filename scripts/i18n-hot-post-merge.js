// i18n do anel "em alta" no avatar do card do feed.
// Idempotente e não-destrutivo (fill-if-absent).
// Rodar: node scripts/i18n-hot-post-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const POST = {
  // Legado da 1a versao (regra "acima da media"); mantida no dict pra nao
  // sumir de traducao ja publicada, mas nao ha mais call-site.
  hotPostAria: [
    "Em alta: recebendo mais que a média do dia",
    "Trending: getting more than today's average",
    "En alza: recibiendo más que el promedio del día",
  ],
  hotPostLeaderAria: [
    "Líder do dia em engajamento",
    "Today's engagement leader",
    "Líder del día en interacción",
  ],
  hotPostRisingAria: [
    "Em alta: perto do líder do dia",
    "Trending: close to today's leader",
    "En alza: cerca del líder del día",
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
  added += mergeNamespace(json, "Post", POST, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
