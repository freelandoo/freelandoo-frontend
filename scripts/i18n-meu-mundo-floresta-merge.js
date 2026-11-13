// Meu Mundo 3D — lore v2 D2: a Floresta da Lua (criaturas da lore por setor e Pedraverde).
// Namespace "MeuMundo". Idempotente: preenche o que falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-meu-mundo-floresta-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  // as criaturas da lore (historia/v2/04-mundo-exploravel.md §1)
  domFoe_mariposa: ["Mariposas Cinzentas", "Grey Moths", "Polillas Grises"],
  domFoe_cervo: ["Cervo Oco", "Hollow Stag", "Ciervo Hueco"],
  domFoe_coruja: ["Coruja de Mil Olhos", "Thousand-Eyed Owl", "Lechuza de Mil Ojos"],
  domFoe_sonambulo: ["Sonâmbulo", "Sleepwalker", "Sonámbulo"],
  domFoe_lobo: ["Lobos de Ferrugem", "Rust Wolves", "Lobos de Óxido"],
  domFoe_selene: ["Selene de Sombra", "Shadow Selene", "Selene de Sombra"],
  domFoe_noctis: ["Noctis", "Noctis", "Noctis"],
  // a clareira com o Golem sentado
  domPlace_pedraverde: ["Pedraverde", "Greenstone", "Piedraverde"],
}

// valores que mudaram depois de publicados (vazio por enquanto)
const OVERRIDE = {
  // 2026-11-12 (Alex): os mil olhos saíram (tripofobia) — vira o Corujão, homem-coruja grandão
  domFoe_coruja: ["Corujão", "Great Owl", "Gran Búho"],
}

const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((loc, i) => {
  const file = path.join(dir, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const ns = (dict.MeuMundo = dict.MeuMundo || {})
  let added = 0
  let changed = 0
  for (const [k, v] of Object.entries(KEYS)) {
    if (!(k in ns)) {
      ns[k] = v[i]
      added++
    }
  }
  for (const [k, v] of Object.entries(OVERRIDE)) {
    if (ns[k] !== v[i]) {
      ns[k] = v[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(`${loc}: +${added} ~${changed}`)
})
