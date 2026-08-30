/**
 * Merge idempotente (fill-if-absent) das chaves do menu "+" da academia:
 * Professores e Ranking saíram do corpo da página e o professor ganhou o
 * link "Ver perfil" no painel.
 *
 * Uso: node scripts/i18n-academy-menu-merge.js
 */
const fs = require("fs")
const path = require("path")

const LOCALES = ["pt-BR", "en", "es"]
const DIR = path.join(__dirname, "..", "messages")

const ACADEMIES = {
  professorViewProfile: ["Ver perfil", "View profile", "Ver perfil"],
}

let touched = 0
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.Academies = dict.Academies || {}
  for (const [key, values] of Object.entries(ACADEMIES)) {
    if (dict.Academies[key] === undefined) {
      dict.Academies[key] = values[idx]
      touched += 1
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`)
})

console.log(`i18n academy menu: ${touched} chave(s) adicionada(s).`)
