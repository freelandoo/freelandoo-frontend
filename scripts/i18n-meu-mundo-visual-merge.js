// Meu Mundo 3D — modernização visual (2026-10-25): aba da gaveta, presença
// online por escopo e o balão de necessidade em duas linhas.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-visual-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  menuOpenNav: ["Abrir navegação", "Open navigation", "Abrir navegación"],
  presenceOne: ["{n} jogador online", "{n} player online", "{n} jugador en línea"],
  presenceMany: ["{n} jogadores online", "{n} players online", "{n} jugadores en línea"],
  presenceConnecting: ["Conectando…", "Connecting…", "Conectando…"],
  presenceOffline: ["Sem conexão", "Offline", "Sin conexión"],
  presenceStreet: ["Neste bairro", "In this neighborhood", "En este barrio"],
  presenceHouse: ["Nesta casa", "In this house", "En esta casa"],
  presenceCenter: ["No centro", "Downtown", "En el centro"],
  needSleepMain: ["Preciso dormir.", "I need to sleep.", "Necesito dormir."],
  needAwakeHours: ["Já estou há {h} horas acordado.", "I've been awake for {h} hours.", "Llevo {h} horas despierto."],
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
console.log(`i18n meu-mundo visual: ${added} chaves adicionadas`)
