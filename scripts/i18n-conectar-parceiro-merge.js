// Namespace "Connect" — ponte de login de site parceiro (/conectar/russamaisrussa).
// Idempotente, fill-if-absent. Rodar: node scripts/i18n-conectar-parceiro-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const CONNECT = {
  eyebrow: ["Entrar com a Freelandoo", "Sign in with Freelandoo", "Entrar con Freelandoo"],
  asideHighlight: ["+ Freelandoo", "+ Freelandoo", "+ Freelandoo"],
  asideSubtitle: [
    "Uma conta só: você entra com o Google pela Freelandoo e volta direto para o site.",
    "One account: sign in with Google through Freelandoo and go straight back to the site.",
    "Una sola cuenta: entras con Google por Freelandoo y vuelves directo al sitio.",
  ],
  bullet1: ["Login com Google, sem senha nova", "Google sign-in, no new password", "Inicio con Google, sin contraseña nueva"],
  bullet2: [
    "CPF e data de nascimento uma vez só",
    "CPF and date of birth only once",
    "CPF y fecha de nacimiento una sola vez",
  ],
  bullet3: [
    "Seus livros e compras ligados à sua conta",
    "Your books and purchases tied to your account",
    "Tus libros y compras vinculados a tu cuenta",
  ],
  title: ["Continue para {site}", "Continue to {site}", "Continúa a {site}"],
  subtitle: [
    "Entre com sua conta da Freelandoo. Se ainda não tem, ela é criada agora.",
    "Sign in with your Freelandoo account. If you don't have one yet, it's created now.",
    "Entra con tu cuenta de Freelandoo. Si aún no tienes, se crea ahora.",
  ],
  identityTitle: ["Falta só o seu CPF", "Just your CPF left", "Solo falta tu CPF"],
  identitySubtitle: [
    "A Freelandoo pede CPF e data de nascimento uma vez só, para proteger compras e acessos.",
    "Freelandoo asks for your CPF and date of birth only once, to protect purchases and access.",
    "Freelandoo pide CPF y fecha de nacimiento una sola vez, para proteger compras y accesos.",
  ],
  checking: ["Conferindo sua conta…", "Checking your account…", "Verificando tu cuenta…"],
  leaving: ["Voltando para {site}…", "Going back to {site}…", "Volviendo a {site}…"],
  emailOption: [
    "Já tem conta na Freelandoo com e-mail e senha?",
    "Already have a Freelandoo account with email and password?",
    "¿Ya tienes cuenta en Freelandoo con correo y contraseña?",
  ],
  emailLogin: ["Entrar com e-mail", "Sign in with email", "Entrar con correo"],
  signedAs: ["Você está na Freelandoo como", "You're signed in to Freelandoo as", "Estás en Freelandoo como"],
  continueAs: ["Continuar para {site}", "Continue to {site}", "Continuar a {site}"],
  switchAccount: ["Usar outra conta", "Use another account", "Usar otra cuenta"],
  saving: ["Salvando…", "Saving…", "Guardando…"],
  saveAndContinue: ["Salvar e continuar", "Save and continue", "Guardar y continuar"],
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  loadFail: [
    "Não foi possível falar com a Freelandoo. Tente de novo.",
    "Couldn't reach Freelandoo. Please try again.",
    "No fue posible comunicarse con Freelandoo. Inténtalo de nuevo.",
  ],
}

const GROUPS = { Connect: CONNECT }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(GROUPS)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (!(key in d[ns])) {
        d[ns][key] = vals[idx]
        added++
      }
    }
  }
  save(file, d)
  console.log(`${file}: +${added}`)
}
