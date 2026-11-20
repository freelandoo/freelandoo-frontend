// Meu Mundo 3D — o roubo da Nívea (19/11, mig 462): chaves novas.
// Idempotente: chave nova entra; valor que mudou é ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-meu-mundo-nivea-merge.js
const fs = require("fs")
const path = require("path")

const KEYS = {
  rewardNectarStolen: ["Néctar para a Nívea", "Nectar to Nívea", "Néctar para Nívea"],
  rkNcNivea: ["Néctar da Nívea", "Nívea's nectar", "Néctar de Nívea"],
  rkNcNiveaHow: [
    "Perder ou fugir de um monstro da rua ou de um Domínio dá à Nívea {pct}% do néctar que você carrega (de {min} a {max}).",
    "Losing to or fleeing from a street or Domain monster gives Nívea {pct}% of the nectar you carry ({min} to {max}).",
    "Perder o huir de un monstruo de la calle o de un Dominio le da a Nívea el {pct}% del néctar que llevas (de {min} a {max}).",
  ],
  rkNcTheftList: ["Extrato do roubo", "Theft log", "Registro del robo"],
  rkNcTheftLine: ["Roubado por um monstro: {mob}", "Stolen by a monster: {mob}", "Robado por un monstruo: {mob}"],
}
const dir = path.join(__dirname, "..", "messages")
let changed = 0
for (const [i, locale] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(KEYS)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo nívea: ${changed} chaves gravadas`)
