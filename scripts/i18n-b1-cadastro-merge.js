// Segurança B1 (2026-11-14): o "Criar meu perfil" do cadastro grava a atuação
// no PERFIL-CONTA (publica de graça), em vez de um segundo perfil "aguardando
// ativação". Frase nova no namespace "Signup" em messages/{pt-BR,en,es}.json.
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
//
// Rodar: node scripts/i18n-b1-cadastro-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SIGNUP = {
  profileDescriptionAccount: [
    "Este é o perfil da sua conta e publica de graça. Depois você pode criar outros perfis.",
    "This is your account's profile and it publishes for free. You can create other profiles later.",
    "Este es el perfil de tu cuenta y publica gratis. Después puedes crear otros perfiles.",
  ],
}

const GROUPS = { Signup: SIGNUP }

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
