// Vaquinha no feed geral + compartilhar com a capa como miniatura (mig 272,
// 2026-10-05). Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-vaquinha-share-feed-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const VAQUINHA = {
  shareCta: ["Compartilhar vaquinha", "Share fundraiser", "Compartir vaquita"],
  shareMenuTitle: ["Compartilhar {name}", "Share {name}", "Compartir {name}"],
  shareMessage: [
    "Ajude a vaquinha {name} na Freelandoo!",
    "Help the fundraiser {name} on Freelandoo!",
    "¡Ayuda a la vaquita {name} en Freelandoo!",
  ],
  shareMessageBolsa: [
    "Apoie a bolsa {name} na Freelandoo!",
    "Support the sponsorship {name} on Freelandoo!",
    "¡Apoya la beca {name} en Freelandoo!",
  ],
  updatesFeedHint: [
    "O que você publica aqui também vai para o feed geral, com um botão que leva a esta vaquinha.",
    "What you post here also goes to the main feed, with a button that leads to this fundraiser.",
    "Lo que publicas aquí también va al feed general, con un botón que lleva a esta vaquita.",
  ],
}

const POST = {
  accessVaquinha: ["Ver vaquinha", "See fundraiser", "Ver vaquita"],
}

const GROUPS = { Vaquinha: VAQUINHA, Post: POST }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
