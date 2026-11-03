// Meu Mundo 3D — nível de aventura dá HP, defesa, ataque e atributos (2026-11-03).
// STATUS (linha de HP no cabeçalho, placa Combate, "+N nv." nos atributos) e o
// modal do LEVEL UP com o aumento de status. Namespace "MeuMundo". Idempotente
// (FILL preenche o que falta).
// Rodar: node scripts/i18n-meu-mundo-hero-level-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  stHp: ["HP", "HP", "HP"],
  stHpLong: ["Vida (HP)", "Health (HP)", "Vida (HP)"],
  stDefShort: ["DEF {n}%", "DEF {n}%", "DEF {n}%"],
  stAtkShort: ["ATQ +{n}%", "ATK +{n}%", "ATQ +{n}%"],
  stCombat: ["Combate", "Combat", "Combate"],
  stDefense: ["Defesa", "Defense", "Defensa"],
  stAttack: ["Ataque", "Attack", "Ataque"],
  stCombatPerLevel: [
    "Cada nível: +{hp} HP · +{def}% defesa · +{atk}% ataque · +{attr} em cada atributo.",
    "Each level: +{hp} HP · +{def}% defense · +{atk}% attack · +{attr} to every attribute.",
    "Cada nivel: +{hp} HP · +{def}% defensa · +{atk}% ataque · +{attr} en cada atributo.",
  ],
  stCombatGear: [
    "O equipamento soma defesa e ataque por cima.",
    "Gear adds defense and attack on top.",
    "El equipo suma defensa y ataque encima.",
  ],
  stCombatPerLevelShort: ["Sobem a cada nível.", "They grow every level.", "Suben con cada nivel."],
  atLevelBonus: ["+{n} nv.", "+{n} lv.", "+{n} nv."],
  atLevelBonusHint: [
    "Bônus do nível de aventura (vale na luta)",
    "Adventure level bonus (applies in fights)",
    "Bono del nivel de aventura (vale en la pelea)",
  ],
  levelUpStatsTitle: ["Status aumentaram", "Stats increased", "Estadísticas aumentaron"],
  levelUpGainHp: ["+{n} de vida máxima (HP)", "+{n} max health (HP)", "+{n} de vida máxima (HP)"],
  levelUpGainDef: ["+{n}% de defesa", "+{n}% defense", "+{n}% de defensa"],
  levelUpGainAtk: ["+{n}% de ataque", "+{n}% attack", "+{n}% de ataque"],
  levelUpGainAttr: [
    "+{n} em força, velocidade, inteligência e destreza",
    "+{n} to strength, speed, intelligence and dexterity",
    "+{n} en fuerza, velocidad, inteligencia y destreza",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(FILL)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo nível de aventura: ${added} chaves adicionadas`)
