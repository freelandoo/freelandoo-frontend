// Meu Mundo 3D — Domínios v2 (DV2/DV3): cenas de mundo aberto, passagem entre elas, monstros soltos.
// Namespace "MeuMundo". Idempotente: preenche o que falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-meu-mundo-dominios-v2-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  domScenePart: ["Parte {n}", "Part {n}", "Parte {n}"],
  domBackScene: ["Voltar à parte anterior", "Back to the previous part", "Volver a la parte anterior"],
  domNextScene: ["Seguir para a parte {n}", "Go on to part {n}", "Seguir a la parte {n}"],
  domSealedShort: ["Selado", "Sealed", "Sellado"],
  domSealedBossShort: ["Passagem fechada", "Passage closed", "Paso cerrado"],
  domSealed: ["Setor {n} selado: vença o setor anterior primeiro.", "Sector {n} is sealed: beat the previous sector first.", "Sector {n} sellado: vence primero el sector anterior."],
  domSealedBoss: ["Vença o chefe desta parte para seguir.", "Beat this part's boss to go on.", "Vence al jefe de esta parte para seguir."],
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
