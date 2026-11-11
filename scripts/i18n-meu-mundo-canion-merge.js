// Meu Mundo 3D — lore v2 D5: o Cânion das Tempestades (criaturas da lore por setor e as fases de Zéphyra).
// Namespace "MeuMundo". Idempotente: preenche o que falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-meu-mundo-canion-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  // as criaturas da lore (historia/v2/04-mundo-exploravel.md §2)
  domFoe_abutre: ["Abutres de Pó", "Dust Vultures", "Buitres de Polvo"],
  domFoe_chacal: ["Chacais de Vento", "Wind Jackals", "Chacales de Viento"],
  domFoe_mensageiro: ["Mensageiro Sem Rosto", "Faceless Messenger", "Mensajero Sin Rostro"],
  domFoe_escorpiao: ["Escorpião Para-raios", "Lightning-Rod Scorpion", "Escorpión Pararrayos"],
  domFoe_harpia: ["Harpias", "Harpies", "Arpías"],
  domFoe_carta: ["A Carta", "The Letter", "La Carta"],
  domFoe_zephyra: ["Zéphyra", "Zéphyra", "Zéphyra"],
  // as fases de Zéphyra (a luta escurece e o céu relampeja)
  laminasZephyraPhase2: ["VENTO QUE DERRUBA", "TOPPLING WIND", "VIENTO QUE DERRIBA"],
  laminasZephyraPhase3: ["RASTRO DE RAIO", "LIGHTNING TRAIL", "ESTELA DE RAYO"],
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
  console.log(`${loc}: +${added} ~${changed}`)
})
