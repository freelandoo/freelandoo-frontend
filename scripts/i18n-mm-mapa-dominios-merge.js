// Mapa dos Domínios (radar + pergaminho na cena aberta). Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ADD = {
  "pt-BR": { mapParts: "Partes do Domínio", mapBoss: "Chefe · Setor {n}", mapGuard: "Guardião · Setor {n}", mapGodCastle: "Castelo de {god}", mapCross: "Travessia: {name}", mapHunt: "{god} te caçando" },
  en: { mapParts: "Domain parts", mapBoss: "Boss · Sector {n}", mapGuard: "Guardian · Sector {n}", mapGodCastle: "{god}'s Castle", mapCross: "Crossing: {name}", mapHunt: "{god} hunting you" },
  es: { mapParts: "Partes del Dominio", mapBoss: "Jefe · Sector {n}", mapGuard: "Guardián · Sector {n}", mapGodCastle: "Castillo de {god}", mapCross: "Travesía: {name}", mapHunt: "{god} te está cazando" },
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
