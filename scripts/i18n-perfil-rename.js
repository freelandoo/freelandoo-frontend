/**
 * Rename "subperfil" -> "perfil" nos 3 dicionários.
 *
 * Não existe hierarquia de perfis (decisão do Alex 2026-09-04): perfil novo
 * entra no MESMO grau, é uma réplica. O termo "subperfil" dizia o contrário em
 * toda a interface.
 *
 * É OVERRIDE, não fill-if-absent: o merge padrão da casa não sobrescreve, e
 * aqui o que precisa mudar é justamente o valor que já existe. Roda em cima do
 * próprio dicionário e é idempotente por construção — depois da primeira
 * passada não sobra nada para casar (2ª execução = 0 alterações).
 *
 *   node scripts/i18n-perfil-rename.js
 */
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")

/** Aplica o mesmo padrão de caixa do original ao termo novo. */
function matchCase(source, replacement) {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) {
    return replacement.toUpperCase()
  }
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

// Plural ANTES do singular: "subperfis" começa com o padrão do singular, que
// comeria o miolo e deixaria "perfil" onde devia ficar "perfis".
const RULES = [
  [/sub[-\s]?perfis/gi, "perfis"],
  [/sub[-\s]?perfil/gi, "perfil"],
  [/sub[-\s]?profiles/gi, "profiles"],
  [/sub[-\s]?profile/gi, "profile"],
  [/sub[-\s]?perfiles/gi, "perfiles"],
]

function rename(value) {
  let out = value
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, (m) => matchCase(m, replacement))
  }
  return out
}

let total = 0
for (const file of ["pt-BR.json", "en.json", "es.json"]) {
  const filePath = path.join(DIR, file)
  const dict = JSON.parse(fs.readFileSync(filePath, "utf8"))
  let changed = 0

  for (const [ns, entries] of Object.entries(dict)) {
    if (!entries || typeof entries !== "object") continue
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value !== "string") continue
      const next = rename(value)
      if (next !== value) {
        entries[key] = next
        changed += 1
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2) + "\n", "utf8")
  console.log(`${file}: ${changed} strings renomeadas`)
  total += changed
}

console.log(`total: ${total}`)
