// Meu Mundo 3D — Paint mm3d-46: cores novas (ponte laranja, dano preto, cama
// elástica vermelha) e o MURO (munição pelo ícone da Freelandoo). Namespace
// "MeuMundo". Idempotente: FILL preenche o que falta; OVERRIDE troca o texto
// que falava do dano "vermelho"/"corações" (o dicionário vence o fallback).
// Rodar: node scripts/i18n-meu-mundo-paint-muro-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  paintColorWall: ["Muro", "Wall", "Muro"],
  paintHowWall: [
    "Levanta um muro onde a mira bate: barra quem passa e o tiro preto. Pegue o ícone da Freelandoo: +10.",
    "Raises a wall where you aim: it blocks players and black shots. Grab the Freelandoo icon: +10.",
    "Levanta un muro donde apuntas: bloquea a quien pasa y el disparo negro. Toma el ícono de Freelandoo: +10.",
  ],
  paintToastEmptyWall: [
    "Sem muro — pegue o ícone da Freelandoo",
    "No walls left — grab the Freelandoo icon",
    "Sin muros — toma el ícono de Freelandoo",
  ],
}

const OVERRIDE = {
  paintHowHarm: [
    "Tira sangue do outro time e apaga a tinta dele.",
    "Drains the other team's health and erases their paint.",
    "Quita sangre al otro equipo y borra su pintura.",
  ],
  paintToastBoss: [
    "Ilha do chefão: dano com o preto e soco!",
    "Boss island: damage with black and punches!",
    "Isla del jefe: ¡daño con el negro y golpes!",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
let changed = 0
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
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo paint muro: ${added} chaves adicionadas, ${changed} trocadas`)
