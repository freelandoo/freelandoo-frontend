// Meu Mundo 3D — Gincana (2026-11-20): Trilha da Crosta, a 3ª fase da Forja (caminho escondido em placas sobre a lava).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-crosta-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhCrosta": [
    "Trilha da Crosta",
    "Crust Trail",
    "Sendero de la Corteza"
  ],
  "gincanaEvCrosta": [
    "Trilha da Crosta",
    "Crust Trail",
    "Sendero de la Corteza"
  ],
  "gincanaPhCrostaPitch": [
    "A lava esfriou em placas e só um caminho aguenta. A placa firme acende em brasa e fica acesa para todos; a falsa afunda na lava. Ache o caminho com os malhos balançando por cima.",
    "The lava cooled into plates and only one path holds. A solid plate glows like an ember and stays lit for everyone; a fake one sinks into the lava. Find the way while the hammers swing overhead.",
    "La lava se enfrió en placas y solo un camino aguanta. La placa firme se enciende como brasa y queda encendida para todos; la falsa se hunde en la lava. Encuentra el camino con los martillos balanceándose encima."
  ],
  "gincanaSecCt1": [
    "Placas",
    "Plates",
    "Placas"
  ],
  "gincanaSecCt2": [
    "Malhos",
    "Hammers",
    "Martillos"
  ],
  "gincanaSecCt3": [
    "Estreito",
    "Narrows",
    "Estrecho"
  ],
  "gincanaSecCt4": [
    "Brasa",
    "Embers",
    "Brasas"
  ],
  "gincanaSecCt5": [
    "Subida",
    "Climb",
    "Subida"
  ],
  "gincanaHowCt1": [
    "Placa acesa é firme: siga as acesas que os outros já acharam.",
    "A lit plate is solid: follow the lit ones others already found.",
    "La placa encendida es firme: sigue las que otros ya encontraron."
  ],
  "gincanaHowCt2": [
    "A falsa afunda na hora e vira buraco. Buraco também mostra o caminho.",
    "A fake plate sinks at once and leaves a hole. Holes show the way too.",
    "La falsa se hunde enseguida y deja un hueco. Los huecos también marcan el camino."
  ],
  "gincanaHowCt3": [
    "O caminho só vai reto ou de lado, nunca na diagonal.",
    "The path only goes straight or sideways, never diagonally.",
    "El camino solo va recto o de lado, nunca en diagonal."
  ],
  "gincanaHowCt4": [
    "Os malhos balançam de lado: espere ele passar antes de pisar.",
    "The hammers swing sideways: let one pass before you step.",
    "Los martillos se balancean de lado: deja que pase antes de pisar."
  ],
  "gincanaHowCt5": [
    "As pedras descem rolando: troque de faixa cedo.",
    "Boulders roll down: change lanes early.",
    "Las piedras bajan rodando: cambia de carril pronto."
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
console.log(`i18n gincana crosta: ${added} chaves adicionadas`)
