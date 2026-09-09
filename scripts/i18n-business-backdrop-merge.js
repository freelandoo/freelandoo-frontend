/**
 * i18n — a cor de FUNDO da plataforma de negócio (2026-09-09).
 *
 * O líder passou a escolher, além do accent (os detalhes), a cor do fundo da
 * página do negócio dele. As chaves abaixo são o rótulo do seletor e o nome de
 * cada cor da lista fechada de `BACKDROPS` (community-ui.ts).
 *
 * FILL-IF-ABSENT, como todo merge da casa: rodar duas vezes não sobrescreve
 * nada e a segunda passada tem que somar 0.
 *
 *   node scripts/i18n-business-backdrop-merge.js
 */
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** chave: [pt, en, es] */
const COMMUNITY = {
  bgLabel: ["Fundo", "Background", "Fondo"],
  bgBlack: ["Preto", "Black", "Negro"],
  bgNavy: ["Azul-noite", "Midnight blue", "Azul noche"],
  bgCyan: ["Ciano", "Cyan", "Cian"],
  bgGreen: ["Verde", "Green", "Verde"],
  bgPurple: ["Roxo", "Purple", "Morado"],
  bgWine: ["Vinho", "Wine", "Vino"],
  bgAmber: ["Âmbar", "Amber", "Ámbar"],
  bgBrown: ["Marrom", "Brown", "Marrón"],
}

let added = 0
LOCALES.forEach((locale, i) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.Community = dict.Community || {}
  for (const [key, values] of Object.entries(COMMUNITY)) {
    if (dict.Community[key] === undefined) {
      dict.Community[key] = values[i]
      added += 1
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
})

console.log(`i18n business backdrop: ${added} chave(s) adicionada(s).`)
