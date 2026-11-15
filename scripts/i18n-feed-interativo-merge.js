// Feed Interativo (2026-11-15): Throw, Stash, Baú, Cápsula, Paths, Sync.
// Namespace "FeedFx". Idempotente: fill-if-absent; OVERRIDE troca valor que já existe.
// Rodar: node scripts/i18n-feed-interativo-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FEEDFX = {
  // ── gesto (F1/F2) ──
  throwFailed: ["NÃO FOI", "DIDN'T GO", "NO SE ENVIÓ"],
  thrownStamp: ["LANÇADO · {n}", "THROWN · {n}", "LANZADO · {n}"],
  saveFailed: ["NÃO SALVOU", "NOT SAVED", "NO SE GUARDÓ"],
  alreadySaved: ["JÁ ESTAVA SALVO", "ALREADY SAVED", "YA ESTABA GUARDADO"],
  savedStamp: ["SALVO", "SAVED", "GUARDADO"],
  throwAllHint: ["Solte para lançar a {n}", "Release to throw to {n}", "Suelta para lanzar a {n}"],
  throwNobody: ["Ninguém para lançar ainda", "No one to throw to yet", "Aún no hay a quién lanzar"],
  trayHint: [
    "Solte em cima de alguém para mandar só para essa pessoa",
    "Drop on someone to send it only to them",
    "Suelta sobre alguien para enviarlo solo a esa persona",
  ],
  saveZone: ["Salvar", "Save", "Guardar"],
}

const OVERRIDE = {}

const GROUPS = { FeedFx: FEEDFX }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  let changed = 0
  for (const [ns, keys] of Object.entries(GROUPS)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (!(key in d[ns])) {
        d[ns][key] = vals[idx]
        added++
      }
    }
  }
  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (d[ns][key] !== vals[idx]) {
        d[ns][key] = vals[idx]
        changed++
      }
    }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves, ${changed} trocadas`)
}
