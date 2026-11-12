// Segurança A1-02 (2026-11-12): a data de nascimento fica só de leitura em
// /account (só o onboarding grava). Merge da chave nova no namespace "Account"
// em messages/{pt-BR,en,es}.json. Idempotente e não-destrutivo: só ADICIONA
// chaves ausentes, nunca sobrescreve.
//
// Rodar: node scripts/i18n-a1-nascimento-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  birthDateLocked: [
    "Para corrigir a data, fale com o suporte.",
    "To correct the date, contact support.",
    "Para corregir la fecha, contacta al soporte.",
  ],
}

const GROUPS = { Account: ACCOUNT }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
