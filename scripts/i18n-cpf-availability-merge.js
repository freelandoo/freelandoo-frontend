// i18n da disponibilidade do CPF no cadastro (ns Signup) e no modal de
// onboarding do login Google (ns Onboarding).
//
// O CPF já era único por conta (mig 188), mas a recusa só aparecia no submit —
// depois de a pessoa responder tudo. Estas chaves são a mesma recusa dita
// AGORA, embaixo do campo, enquanto ela digita.
//
// Fill-if-absent (padrão do projeto). Idempotente.
// Rodar: node scripts/i18n-cpf-availability-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SIGNUP_NEW = {
  cpfChecking: ["Verificando...", "Checking...", "Verificando..."],
  cpfAvailable: ["CPF disponível ✓", "CPF available ✓", "CPF disponible ✓"],
  cpfTaken: [
    "Já existe uma conta com este CPF. Entre nela — dentro dela você cria quantos perfis quiser.",
    "There is already an account with this CPF. Sign in to it — inside it you can create as many profiles as you want.",
    "Ya existe una cuenta con este CPF. Entra en ella — dentro de ella puedes crear todos los perfiles que quieras.",
  ],
  cpfTakenLogin: ["Entrar", "Sign in", "Entrar"],
  blockCpfChecking: [
    "Verificando o CPF...",
    "Checking the CPF...",
    "Verificando el CPF...",
  ],
  blockCpfTaken: [
    "Já existe uma conta com este CPF.",
    "There is already an account with this CPF.",
    "Ya existe una cuenta con este CPF.",
  ],
}

const ONBOARDING_NEW = {
  cpfChecking: ["Verificando...", "Checking...", "Verificando..."],
  cpfAvailable: ["CPF disponível ✓", "CPF available ✓", "CPF disponible ✓"],
  cpfTaken: [
    "Já existe uma conta com este CPF. Entre nela — dentro dela você cria quantos perfis quiser.",
    "There is already an account with this CPF. Sign in to it — inside it you can create as many profiles as you want.",
    "Ya existe una cuenta con este CPF. Entra en ella — dentro de ella puedes crear todos los perfiles que quieras.",
  ],
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
  let added = 0
  added += fillIfAbsent(json, "Signup", SIGNUP_NEW, i)
  added += fillIfAbsent(json, "Onboarding", ONBOARDING_NEW, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
