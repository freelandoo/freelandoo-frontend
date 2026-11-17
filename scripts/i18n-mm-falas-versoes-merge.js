// Meu Mundo 3D — as VERSÕES das falas (2026-11-17, pedido do Alex): +5 por fala que era única
// (avisos de necessidade e falas da casa) e a mágoa/carinho na voz de cada personalidade.
// Fonte única: features/meu-mundo/ui/inbox/voice-variants.json ({ chave: [pt, en, es] }), que a
// tela também lê como fallback em pt. Namespace "MeuMundo".
// Idempotente: chave nova entra; valor que mudou no JSON é ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-mm-falas-versoes-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")
const TEXT = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "features", "meu-mundo", "ui", "inbox", "voice-variants.json"), "utf8"))

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
console.log(`i18n meu-mundo falas (versões): ${changed} chaves gravadas`)
