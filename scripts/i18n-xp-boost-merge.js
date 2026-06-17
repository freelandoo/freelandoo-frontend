// Namespace "Polens" — booster de XP (nível 5) na loja de poléns. Idempotente,
// fill-if-absent. Rodar: node scripts/i18n-xp-boost-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const POLENS = {
  boosterEyebrow: ["Atalho", "Shortcut", "Atajo"],
  boosterTitle: ["Booster de Nível 5", "Level 5 Booster", "Booster de Nivel 5"],
  boosterDesc: [
    "Leve um subperfil direto ao nível 5 — desbloqueia criar comunidade e muito mais.",
    "Take a sub-profile straight to level 5 — unlocks creating a community and much more.",
    "Lleva un subperfil directo al nivel 5 — desbloquea crear comunidad y mucho más.",
  ],
  boosterPriceNote: [
    "Pagamento único de {price} via Stripe.",
    "One-time payment of {price} via Stripe.",
    "Pago único de {price} vía Stripe.",
  ],
  boosterNoProfiles: [
    "Você não tem subperfis elegíveis (abaixo do nível 5).",
    "You have no eligible sub-profiles (below level 5).",
    "No tienes subperfiles elegibles (por debajo del nivel 5).",
  ],
  boosterSelectProfile: ["Escolha o subperfil", "Choose the sub-profile", "Elige el subperfil"],
  boosterLevel: ["Nível {n}", "Level {n}", "Nivel {n}"],
  boosterCta: ["Impulsionar ao nível 5", "Boost to level 5", "Impulsar al nivel 5"],
  boosterPickFirst: ["Escolha um subperfil primeiro.", "Choose a sub-profile first.", "Elige un subperfil primero."],
  boostSuccessTitle: ["Perfil impulsionado!", "Profile boosted!", "¡Perfil impulsado!"],
  boostSuccessMsg: [
    "Seu subperfil foi levado ao nível 5. O nível atualiza em instantes.",
    "Your sub-profile was taken to level 5. The level updates in moments.",
    "Tu subperfil fue llevado al nivel 5. El nivel se actualiza en instantes.",
  ],
}

const GROUPS = { Polens: POLENS }

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
