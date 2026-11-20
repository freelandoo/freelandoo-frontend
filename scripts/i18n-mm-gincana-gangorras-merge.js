// Meu Mundo 3D — Gincana (2026-11-20): Gangorras do Desfiladeiro, a 3ª fase do Cânion (gangorras que inclinam com o peso).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-gangorras-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhGangorras": [
    "Gangorras do Desfiladeiro",
    "Canyon Seesaws",
    "Balancines del Desfiladero"
  ],
  "gincanaEvGangorras": [
    "Peso na Tábua",
    "Weight on the Plank",
    "Peso en la Tabla"
  ],
  "gincanaPhGangorrasPitch": [
    "A terceira corrida do Cânion: pontes de gangorra sobre o desfiladeiro que inclinam com o peso de quem está em cima. Passe do eixo e a tábua tomba para a frente.",
    "The Canyon's third race: seesaw bridges over the gorge that tilt with the weight of whoever is on them. Cross the pivot and the plank tips forward.",
    "La tercera carrera del Cañón: puentes de balancín sobre el desfiladero que se inclinan con el peso de quien está encima. Pasa el eje y la tabla cae hacia delante."
  ],
  "gincanaSecGa1": [
    "Gangorras",
    "Seesaws",
    "Balancines"
  ],
  "gincanaSecGa2": [
    "Corrente",
    "Chain",
    "Cadena"
  ],
  "gincanaSecGa3": [
    "Pratos",
    "Plates",
    "Platillos"
  ],
  "gincanaSecGa4": [
    "Balança",
    "Big scale",
    "Balanza"
  ],
  "gincanaSecGa5": [
    "Subida",
    "Climb",
    "Subida"
  ],
  "gincanaHowGa1": [
    "A gangorra tomba para o lado que tem mais peso: passou do eixo, ela desce na frente.",
    "The seesaw tips toward the heavier side: once you cross the pivot, the front goes down.",
    "El balancín cae hacia el lado con más peso: pasado el eje, baja por delante."
  ],
  "gincanaHowGa2": [
    "Tem gente na frente? A sua ponta fica no alto: pule para subir nela.",
    "People ahead of you? Your end is up high: jump to get on it.",
    "¿Hay gente delante? Tu punta queda en alto: salta para subir."
  ],
  "gincanaHowGa3": [
    "Os pratos tombam de lado: fique perto do meio ou escorrega para o vazio.",
    "The plates tip sideways: stay near the middle or you slide into the void.",
    "Los platillos se inclinan de lado: quédate cerca del centro o resbalas al vacío."
  ],
  "gincanaHowGa4": [
    "A balança grande só desce quando a turma passa do meio.",
    "The big scale only tips once the crowd gets past the middle.",
    "La balanza grande solo baja cuando el grupo pasa del centro."
  ],
  "gincanaHowGa5": [
    "Na subida as pedras descem rolando: troque de faixa cedo.",
    "On the climb the stones roll down: switch lanes early.",
    "En la subida las piedras bajan rodando: cambia de carril pronto."
  ]
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
console.log(`i18n gincana gangorras: ${added} chaves adicionadas`)
