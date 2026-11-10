// Meu Mundo 3D — lore v2 F3: os 10 capítulos (títulos, introdução por classe, passos).
// Fonte única: features/meu-mundo/ui/quest/chapters-text.json ({ chave: [pt, en, es] }),
// que a tela também lê como fallback em pt. Namespace "MeuMundo".
// Idempotente: chave nova entra; valor que mudou no JSON é ATUALIZADO (OVERRIDE),
// para o texto da tela e o das traduções nunca divergirem.
// Rodar: node scripts/i18n-meu-mundo-capitulos-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")
const TEXT = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "features", "meu-mundo", "ui", "quest", "chapters-text.json"), "utf8"))

const LOCALES = ["pt-BR", "en", "es"]
let changed = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(TEXT)) {
    if (!Array.isArray(vals) || vals.length !== 3) throw new Error(`chave ${key}: precisa de [pt, en, es]`)
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo capítulos: ${changed} chaves gravadas`)
