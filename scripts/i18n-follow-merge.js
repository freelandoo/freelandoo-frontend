// Namespace "Follow" — botão de acompanhar (user-level; sem seletor de subperfil).
// Idempotente, fill-if-absent. Rodar:
//   node scripts/i18n-follow-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FOLLOW = {
  follow: ["Acompanhar", "Follow", "Seguir"],
  following: ["Acompanhando", "Following", "Siguiendo"],
  unfollow: ["Deixar de acompanhar", "Unfollow", "Dejar de seguir"],
  errorUpdate: [
    "Não foi possível atualizar agora.",
    "Couldn't update right now.",
    "No se pudo actualizar ahora.",
  ],
  errorSelf: [
    "A entidade não pode acompanhar ela mesma.",
    "An entity can't follow itself.",
    "La entidad no puede seguirse a sí misma.",
  ],
}

const GROUPS = { Follow: FOLLOW }

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
