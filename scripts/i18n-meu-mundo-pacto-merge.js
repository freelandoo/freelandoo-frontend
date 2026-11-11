// Meu Mundo 3D — lore v2 D4: as fases do deus chefão (luta do setor 10) e o PACTO do deus
// vencido (aba Semana, painel da estátua, recibo da vitória no Domínio).
// Namespace "MeuMundo". Idempotente: chave nova entra; valor que mudou é ATUALIZADO
// (OVERRIDE), para o fallback da tela e as traduções nunca divergirem.
// Rodar: node scripts/i18n-meu-mundo-pacto-merge.js
const fs = require("fs")
const path = require("path")

const TEXT = {
  laminasBossPhase2: ["LUA MINGUANTE", "WANING MOON", "LUNA MENGUANTE"],
  laminasBossPhase3: ["LUA NOVA", "NEW MOON", "LUNA NUEVA"],
  pactListTitle: ["Pactos dos deuses", "Pacts of the gods", "Pactos de los dioses"],
  pactTitle: ["Pacto de {god}", "Pact of {god}", "Pacto de {god}"],
  pactLine: ["{clan}: +{pct}% de néctar no {game} até {date}.", "{clan}: +{pct}% nectar in {game} until {date}.", "{clan}: +{pct}% de néctar en {game} hasta el {date}."],
  pactOurs: [
    "É do seu povo: jogue o {game} para render mais néctar nesta semana.",
    "It belongs to your people: play {game} to earn more nectar this week.",
    "Es de tu pueblo: juega {game} para ganar más néctar esta semana.",
  ],
  pactClanRaposa: ["Raposas", "Foxes", "Zorros"],
  pactClanVampiro: ["Vampiros", "Vampires", "Vampiros"],
  pactGodNoctis: ["Noctis", "Noctis", "Noctis"],
  pactGodZephyra: ["Zéphyra", "Zéphyra", "Zéphyra"],
  pactGodMaru: ["Marú", "Marú", "Marú"],
  pactGodAeryn: ["Aeryn", "Aeryn", "Aeryn"],
  pactGodKragor: ["Kragor", "Kragor", "Kragor"],
  pactGodIris: ["Íris", "Íris", "Íris"],
  rkNcPact: ["{n} do pacto", "{n} from the pact", "{n} del pacto"],
  domPactSealed: [
    "Pacto selado: o seu povo ganha néctar extra por 7 dias.",
    "Pact sealed: your people earn extra nectar for 7 days.",
    "Pacto sellado: tu pueblo gana néctar extra durante 7 días.",
  ],
  domPactKept: [
    "O pacto do seu povo com este deus já está de pé.",
    "Your people's pact with this god is already in place.",
    "El pacto de tu pueblo con este dios ya está en pie.",
  ],
}

const dir = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]
let changed = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(TEXT)) {
    if (!Array.isArray(vals) || vals.length !== 3) throw new Error(`chave ${key}: precisa de [pt, en, es]`)
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo pacto: ${changed} chaves gravadas`)
