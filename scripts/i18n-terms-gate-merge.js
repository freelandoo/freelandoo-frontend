// Aceite de termos no cadastro/Google (tela /aceitar-termos + clickwrap do cadastro):
// merge de chaves novas nos namespaces "Auth" e "Signup" em messages/{pt-BR,en,es}.json.
// Idempotente e não-destrutivo (fill-if-absent), exceto FORCE_OVERRIDES (corrige casing).
//
// Rodar: node scripts/i18n-terms-gate-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const AUTH = {
  termsGateEyebrow: ["Quase lá", "Almost there", "Casi listo"],
  termsGateAsideTitle: ["Falta só", "Just one", "Solo falta"],
  termsGateAsideHighlight: ["um passo", "step", "un paso"],
  termsGateAsideSubtitle: [
    "Para usar a Freelandoo — vender, comprar, publicar e receber — precisamos do seu aceite aos nossos termos.",
    "To use Freelandoo — sell, buy, publish and get paid — we need you to accept our terms.",
    "Para usar Freelandoo — vender, comprar, publicar y recibir — necesitamos que aceptes nuestros términos.",
  ],
  termsGateBullet1: [
    "Você controla seus dados (LGPD)",
    "You control your data (LGPD)",
    "Tú controlas tus datos (LGPD)",
  ],
  termsGateBullet2: [
    "Pagamentos protegidos e repasses transparentes",
    "Protected payments and transparent payouts",
    "Pagos protegidos y transferencias transparentes",
  ],
  termsGateBullet3: [
    "Regras claras para a comunidade",
    "Clear rules for the community",
    "Reglas claras para la comunidad",
  ],
  termsGateTitle: [
    "Aceite os termos para continuar",
    "Accept the terms to continue",
    "Acepta los términos para continuar",
  ],
  termsGateSubtitle: [
    "Você entrou com sucesso. Antes de continuar, leia e aceite os documentos abaixo.",
    "You're signed in. Before continuing, please read and accept the documents below.",
    "Has iniciado sesión. Antes de continuar, lee y acepta los documentos a continuación.",
  ],
  termsGateBody: [
    "A Freelandoo conecta profissionais e clientes e processa pagamentos de cursos, produtos, serviços e recursos digitais. Ao continuar, você concorda com os documentos a seguir:",
    "Freelandoo connects professionals and clients and processes payments for courses, products, services and digital resources. By continuing, you agree to the documents below:",
    "Freelandoo conecta a profesionales y clientes y procesa pagos de cursos, productos, servicios y recursos digitales. Al continuar, aceptas los siguientes documentos:",
  ],
  termsGateCheckbox: [
    "Li e aceito os Termos de Uso e a Política de Privacidade da Freelandoo.",
    "I have read and accept Freelandoo's Terms of Use and Privacy Policy.",
    "He leído y acepto los Términos de Uso y la Política de Privacidad de Freelandoo.",
  ],
  termsGateSubmitting: ["Salvando...", "Saving...", "Guardando..."],
  termsGateAccept: ["Concordar e continuar", "Agree and continue", "Aceptar y continuar"],
  termsOfUse: ["Termos de Uso", "Terms of Use", "Términos de Uso"],
  privacyPolicy: ["Política de Privacidade", "Privacy Policy", "Política de Privacidad"],
}

const SIGNUP = {
  googleTermsPrefix: [
    "Ao continuar com o Google, você concorda com os",
    "By continuing with Google, you agree to the",
    "Al continuar con Google, aceptas los",
  ],
  and: ["e a", "and the", "y la"],
  privacyPolicy: ["Política de Privacidade", "Privacy Policy", "Política de Privacidad"],
  termsOfUse: ["Termos de Uso", "Terms of Use", "Términos de Uso"],
}

const GROUPS = { Auth: AUTH, Signup: SIGNUP }

// Chaves que devem ser CORRIGIDAS mesmo se já existirem (ajuste de casing).
const FORCE_OVERRIDES = {
  Signup: { termsOfUse: ["Termos de Uso", "Terms of Use", "Términos de Uso"] },
}

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
  for (const [ns, group] of Object.entries(FORCE_OVERRIDES)) {
    for (const [k, vals] of Object.entries(group)) {
      if (!d[ns]) d[ns] = {}
      d[ns][k] = vals[idx]
    }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves (+overrides)`)
}
