// i18n do onboarding em 2 passos (mig 200) — passo 2 pede enxame, profissão e
// cidade do perfil-conta, e o modal ganhou navegação (progresso/voltar/próximo).
// Idempotente. Rodar: node scripts/i18n-onboarding-taxonomy-merge.js
//
// NEW é fill-if-absent (padrão do projeto). Não há OVERRIDE aqui: as chaves
// antigas (title/description/descriptionCpfOnly) seguem descrevendo o passo 1,
// que continua igual.
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ONBOARDING_NEW = {
  stepCounter: [
    "Passo {current} de {total}",
    "Step {current} of {total}",
    "Paso {current} de {total}",
  ],
  back: ["Voltar", "Back", "Volver"],
  next: ["Próximo", "Next", "Siguiente"],
  stepTaxonomyTitle: ["Como você atua", "What you do", "A qué te dedicas"],
  stepTaxonomyDescription: [
    "Escolha seu enxame, sua profissão e sua cidade. É assim que as pessoas encontram você na vitrine e no ranking.",
    "Pick your swarm, your profession and your city. That's how people find you in the showcase and in the ranking.",
    "Elige tu enjambre, tu profesión y tu ciudad. Así es como la gente te encuentra en la vitrina y en el ranking.",
  ],
  machineLabel: ["Enxame", "Swarm", "Enjambre"],
  selectMachine: [
    "Selecione um enxame",
    "Select a swarm",
    "Selecciona un enjambre",
  ],
  selectMachineFirst: [
    "Escolha o enxame primeiro",
    "Pick the swarm first",
    "Elige primero el enjambre",
  ],
  professionLabel: ["Profissão", "Profession", "Profesión"],
  selectProfession: [
    "Selecione uma profissão",
    "Select a profession",
    "Selecciona una profesión",
  ],
  stateLabel: ["Estado", "State", "Estado"],
  selectState: ["UF", "State", "Estado"],
  selectStateFirst: ["Escolha a UF", "Pick the state", "Elige el estado"],
  cityLabel: ["Cidade", "City", "Ciudad"],
  selectCity: [
    "Selecione a cidade",
    "Select the city",
    "Selecciona la ciudad",
  ],
  loading: ["Carregando...", "Loading...", "Cargando..."],
}

const LOCALES = ["pt-BR", "en", "es"]

function fillIfAbsent(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  const added = fillIfAbsent(json, "Onboarding", ONBOARDING_NEW, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
