// Onda 5 do i18n (Dinheiro): merge de chaves novas em messages/{pt-BR,en,es}.json.
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
// Áreas: checkout, pagamentos, carteira (wallet), poléns, manifestação, premium.
// Placeholders {x} preservados (provider não interpola — montar em JS). Rodar:
//   node scripts/i18n-onda5-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// Namespace "Checkout" — chaves novas da S1 (checkout + páginas de retorno).
const CHECKOUT = {
  eyebrowPayment: ["Pagamento", "Payment", "Pago"],
  successHeading: ["CONFIRMADO.", "CONFIRMED.", "CONFIRMADO."],
  successDescription: [
    'Recebemos seu pagamento. Assim que o Stripe confirmar, seu perfil será ativado automaticamente nos classificados — em alguns segundos o status aparece em "Minha conta".',
    'We received your payment. As soon as Stripe confirms it, your profile will be activated automatically in the listings — within seconds the status will show in "My account".',
    'Recibimos tu pago. En cuanto Stripe lo confirme, tu perfil se activará automáticamente en los clasificados — en segundos el estado aparecerá en "Mi cuenta".',
  ],
  goToMyAccount: ["Ir para minha conta", "Go to my account", "Ir a mi cuenta"],
  backToHome: ["Voltar ao início", "Back to home", "Volver al inicio"],
  cancelledHeading: ["CANCELADO.", "CANCELLED.", "CANCELADO."],
  cancelledDescription: [
    "Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.",
    "No charge was made. You can try again whenever you like.",
    "No se cobró nada. Puedes intentarlo de nuevo cuando quieras.",
  ],
  tryAgain: ["Tentar novamente", "Try again", "Intentar de nuevo"],
}

const GROUPS = { Checkout: CHECKOUT }

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
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
