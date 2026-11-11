// Meu Mundo 3D — lore v2 C5 (cap. 8 "Pedraverde"): o Golem manda largar a arma; o botão
// guarda a arma na mochila. Namespace "MeuMundo". Idempotente: preenche o que falta;
// OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-meu-mundo-pedraverde-merge.js
// (as falas do capítulo moram nos JSON de npcs/capítulos/vozes, com os merges de lá)
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  domStowWeapon: ["Guardar a arma", "Put the weapon away", "Guardar el arma"],
  domWeaponStowed: ["Arma guardada na mochila.", "Weapon put away in the backpack.", "Arma guardada en la mochila."],
}

// valores que mudaram depois de publicados (vazio por enquanto)
const OVERRIDE = {}

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
  console.log(`${loc}: +${added} novas, ${changed} trocadas`)
})
