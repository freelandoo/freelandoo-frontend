// A cor de destaque "Vermelho escuro" (padrão da comunidade de carro, 2026-09-24).
// Idempotente e fill-if-absent, como os outros scripts i18n-*-merge.js.
const fs = require("fs")
const path = require("path")

const COMMUNITY = {
  accentCrimson: ["Vermelho escuro", "Dark red", "Rojo oscuro"],
}

const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((locale, i) => {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`)
  const raw = fs.readFileSync(file, "utf8")
  const dict = JSON.parse(raw)
  dict.Community = dict.Community || {}
  let added = 0
  for (const [key, vals] of Object.entries(COMMUNITY)) {
    if (dict.Community[key] === undefined) {
      dict.Community[key] = vals[i]
      added++
    }
  }
  if (added) {
    const out = JSON.stringify(dict, null, 2) + "\n"
    fs.writeFileSync(file, raw.includes("\r\n") ? out.replace(/\n/g, "\r\n") : out)
  }
  console.log(`${locale}: +${added}`)
})
