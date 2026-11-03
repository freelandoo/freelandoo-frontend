// mm3d-60r: radar e mapa da cidade. Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ADD = {
  "pt-BR": { mapOpen: "Abrir o mapa", mapTitleCenter: "Mapa do Centro", mapTitleBairro: "Mapa do Bairro", mapYouAreHere: "Você está aqui", mapMyHouse: "Minha casa", mapPlaza: "Praça de Aurion" },
  en: { mapOpen: "Open the map", mapTitleCenter: "Downtown Map", mapTitleBairro: "Neighborhood Map", mapYouAreHere: "You are here", mapMyHouse: "My house", mapPlaza: "Aurion Square" },
  es: { mapOpen: "Abrir el mapa", mapTitleCenter: "Mapa del Centro", mapTitleBairro: "Mapa del Barrio", mapYouAreHere: "Estás aquí", mapMyHouse: "Mi casa", mapPlaza: "Plaza de Aurion" },
}
for (const [lang, keys] of Object.entries(ADD)) {
  const f = path.join(DIR, `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
}
