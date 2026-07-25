// i18n do scroll infinito da vitrine (/search) — rodapé das grades.
// Idempotente e não-destrutivo (fill-if-absent).
// Rodar: node scripts/i18n-vitrine-infinite-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SEARCH = {
  loadingMore: ["Carregando mais", "Loading more", "Cargando más"],
  endOfList: ["Você chegou ao fim", "You reached the end", "Llegaste al final"],
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
  added += mergeNamespace(json, "Search", SEARCH, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
