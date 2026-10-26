// Meu Mundo 3D — mm3d-37f: prisão (dirigir na praça e atropelar).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-prisao-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  carJailed: ["Preso não dirige.", "You can't drive while in jail.", "Preso no conduce."],
  crimeHitJail: [
    "Você atropelou alguém: {n} minutos na delegacia.",
    "You ran someone over: {n} minutes at the police station.",
    "Atropellaste a alguien: {n} minutos en la comisaría.",
  ],
  crimePlazaJail: [
    "Dirigiu na praça de novo: {n} minutos na delegacia.",
    "You drove in the square again: {n} minutes at the police station.",
    "Condujiste en la plaza otra vez: {n} minutos en la comisaría.",
  ],
  crimePlazaFine: [
    "Dirigir na praça é proibido: multa de {n} moedas. Na próxima, prisão.",
    "Driving in the square is forbidden: {n} coin fine. Next time, jail.",
    "Conducir en la plaza está prohibido: multa de {n} monedas. La próxima, cárcel.",
  ],
  jailLeft: ["Livre em {t}", "Free in {t}", "Libre en {t}"],
  jailReleasing: ["Saindo da cela…", "Leaving the cell…", "Saliendo de la celda…"],
  ntFined: ["Multa de {n} moedas.", "{n} coin fine.", "Multa de {n} monedas."],
  ntFinedLine: [
    "Dirigir na praça é proibido. Na próxima vez no mesmo dia, prisão.",
    "Driving in the square is forbidden. Next time the same day, jail.",
    "Conducir en la plaza está prohibido. La próxima vez el mismo día, cárcel.",
  ],
  ntJailed: ["Fui preso: {n} minutos na delegacia.", "I got arrested: {n} minutes at the police station.", "Me arrestaron: {n} minutos en la comisaría."],
  ntJailedHit: ["Atropelei alguém com o carro.", "I ran someone over with the car.", "Atropellé a alguien con el auto."],
  ntJailedPlaza: ["Dirigi na praça de novo no mesmo dia.", "I drove in the square again the same day.", "Conduje en la plaza otra vez el mismo día."],
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
console.log(`i18n mm3d-37f prisão: ${added} chaves adicionadas`)
