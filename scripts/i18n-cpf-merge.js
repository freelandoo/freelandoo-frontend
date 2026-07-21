// i18n do CPF obrigatório por conta (mig 188) — campo no /cadastro (ns Signup)
// e no modal de onboarding do login Google (ns Onboarding).
// Idempotente. Rodar: node scripts/i18n-cpf-merge.js
//
// Duas listas: NEW é fill-if-absent (padrão do projeto); OVERRIDE reescreve
// chaves que JÁ existem e cujo texto mudou por causa do CPF — sem isso o dict
// venceria o fallback inline e os 3 idiomas seguiriam falando só de nascimento.
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SIGNUP_NEW = {
  cpfLabel: ["CPF", "CPF (Brazilian tax ID)", "CPF (documento brasileño)"],
  cpfHint: [
    "Uma conta por CPF. Dentro dela você cria quantos perfis quiser.",
    "One account per CPF. Inside it you can create as many profiles as you want.",
    "Una cuenta por CPF. Dentro de ella puedes crear todos los perfiles que quieras.",
  ],
  cpfInvalid: [
    "CPF inválido. Confira os números.",
    "Invalid CPF. Check the numbers.",
    "CPF inválido. Revisa los números.",
  ],
  blockCpf: [
    "Informe um CPF válido.",
    "Enter a valid CPF.",
    "Ingresa un CPF válido.",
  ],
}

const SIGNUP_OVERRIDE = {
  accessDescription: [
    "Uma senha forte, sua data de nascimento e seu CPF.",
    "A strong password, your date of birth and your CPF.",
    "Una contraseña fuerte, tu fecha de nacimiento y tu CPF.",
  ],
}

const ONBOARDING_NEW = {
  cpfLabel: ["CPF", "CPF (Brazilian tax ID)", "CPF (documento brasileño)"],
  cpfHint: [
    "Uma conta por CPF. Dentro dela você cria quantos perfis quiser.",
    "One account per CPF. Inside it you can create as many profiles as you want.",
    "Una cuenta por CPF. Dentro de ella puedes crear todos los perfiles que quieras.",
  ],
  cpfInvalid: [
    "CPF inválido. Confira os números.",
    "Invalid CPF. Check the numbers.",
    "CPF inválido. Revisa los números.",
  ],
  descriptionCpfOnly: [
    "Informe seu CPF para continuar usando a Freelandoo. É uma conta por CPF — dentro dela você cria quantos perfis quiser.",
    "Enter your CPF to keep using Freelandoo. It's one account per CPF — inside it you can create as many profiles as you want.",
    "Ingresa tu CPF para seguir usando Freelandoo. Es una cuenta por CPF — dentro de ella puedes crear todos los perfiles que quieras.",
  ],
}

const ONBOARDING_OVERRIDE = {
  description: [
    "Informe sua data de nascimento e seu CPF para usar a Freelandoo. Se você for menor de 18 anos, vai precisar de um código parental de um responsável adulto.",
    "Enter your date of birth and your CPF to use Freelandoo. If you are under 18, you'll need a parental code from an adult guardian.",
    "Ingresa tu fecha de nacimiento y tu CPF para usar Freelandoo. Si eres menor de 18 años, necesitarás un código parental de un adulto responsable.",
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

function overwrite(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let changed = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] !== values[localeIndex]) {
      json[ns][key] = values[localeIndex]
      changed++
    }
  }
  return changed
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  let changed = 0
  added += fillIfAbsent(json, "Signup", SIGNUP_NEW, i)
  added += fillIfAbsent(json, "Onboarding", ONBOARDING_NEW, i)
  changed += overwrite(json, "Signup", SIGNUP_OVERRIDE, i)
  changed += overwrite(json, "Onboarding", ONBOARDING_OVERRIDE, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves, ${changed} atualizadas`)
}
