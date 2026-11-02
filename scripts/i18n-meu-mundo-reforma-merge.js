// Meu Mundo 3D — mm3d-59 REFORMA (recibos, XP de aventura, destreza, gramática dos ganhos).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-reforma-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  rewardReceipt: ["O que você ganhou", "What you earned", "Lo que ganaste"],
  rewardXp: ["XP de aventura", "Adventure XP", "XP de aventura"],
  rewardLevelLine: ["Nível {from} → {to}", "Level {from} → {to}", "Nivel {from} → {to}"],
  attrStrength: ["Força", "Strength", "Fuerza"],
  attrIntelligence: ["Inteligência", "Intelligence", "Inteligencia"],
  attrDexterity: ["Destreza", "Dexterity", "Destreza"],
  attrSpeed: ["Velocidade", "Speed", "Velocidad"],
  vitalEnergy: ["Energia", "Energy", "Energía"],
  vitalStress: ["Estresse", "Stress", "Estrés"],
  vitalSatiety: ["Saciedade", "Fullness", "Saciedad"],
  vitalMood: ["Humor", "Mood", "Ánimo"],
  vitalHealth: ["Saúde", "Health", "Salud"],
  fightChecking: ["Conferindo a luta…", "Checking the fight…", "Verificando la pelea…"],
  fightOffline: [
    "Treino sem conexão com o servidor: sem prêmio desta vez.",
    "Practice without a server connection: no reward this time.",
    "Entrenamiento sin conexión con el servidor: sin premio esta vez.",
  ],
  rarityCommon: ["Comum", "Common", "Común"],
  rarityUncommon: ["Incomum", "Uncommon", "Poco común"],
  rarityRare: ["Raro", "Rare", "Raro"],
  rarityEpic: ["Épico", "Epic", "Épico"],
  rarityLegendary: ["Lendário", "Legendary", "Legendario"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo reforma: ${added} chaves adicionadas`)
