// Academias — Recebimentos pela Freelandoo e repasses (mig 310 do back):
// chave PIX da academia e o recibo de cada repasse. Namespace "Academies".
// Idempotente, fill-if-absent. Rodar: node scripts/i18n-academy-payouts-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACADEMIES = {
  payoutsTitle: ["Recebimentos pela Freelandoo", "Payments through Freelandoo", "Cobros por Freelandoo"],
  payoutsOn: ["Alunos já podem pagar", "Students can pay now", "Los alumnos ya pueden pagar"],
  payoutsOff: ["Pagamento desligado", "Payments off", "Pagos desactivados"],
  payoutsExplain: [
    "Seus alunos pagam a mensalidade pelo app. A Freelandoo fica com a tarifa do Mercado Pago + {fee} por pagamento e manda o resto por PIX para a chave abaixo, {days} dias depois do pagamento.",
    "Your students pay the fee in the app. Freelandoo keeps the Mercado Pago fee + {fee} per payment and sends the rest by PIX to the key below, {days} days after the payment.",
    "Tus alumnos pagan la mensualidad en la app. Freelandoo se queda con la tarifa de Mercado Pago + {fee} por pago y envía el resto por PIX a la clave de abajo, {days} días después del pago.",
  ],
  payoutsNoCallback: [
    "O software da sua academia ainda não avisa a Freelandoo das baixas (capabilities). Enquanto isso, o botão Pagar não aparece para os alunos.",
    "Your gym software doesn't confirm payments back to Freelandoo yet (capabilities). Until then, students won't see the Pay button.",
    "El software de tu gimnasio aún no confirma los pagos a Freelandoo (capabilities). Mientras tanto, los alumnos no verán el botón Pagar.",
  ],
  payoutsKey: ["Chave PIX", "PIX key", "Clave PIX"],
  payoutsKeyType: ["Tipo de chave", "Key type", "Tipo de clave"],
  payoutsChange: ["Trocar chave", "Change key", "Cambiar clave"],
  payoutsHolder: ["Nome do titular", "Account holder", "Nombre del titular"],
  payoutsDoc: ["CPF ou CNPJ do titular", "Holder's CPF or CNPJ", "CPF o CNPJ del titular"],
  payoutsDocRule: [
    "O titular precisa ser você (o CPF da sua conta) ou a academia (CNPJ).",
    "The holder must be you (your account's CPF) or the gym (CNPJ).",
    "El titular debe ser tú (el CPF de tu cuenta) o el gimnasio (CNPJ).",
  ],
  payoutsSave: ["Salvar chave", "Save key", "Guardar clave"],
  payoutsSaved: ["Chave PIX salva", "PIX key saved", "Clave PIX guardada"],
  payoutsSaveError: ["Não deu para salvar a chave", "Couldn't save the key", "No se pudo guardar la clave"],
  payoutsList: ["Repasses", "Payouts", "Transferencias"],
  payoutsEmpty: [
    "Nenhuma mensalidade paga pela Freelandoo ainda.",
    "No fees paid through Freelandoo yet.",
    "Aún no hay mensualidades pagadas por Freelandoo.",
  ],
  payoutsStudent: ["Aluno", "Student", "Alumno"],
  payoutsPaidOn: ["pago em {d}", "paid on {d}", "pagado el {d}"],
  payoutsAvailableOn: ["liberado em {d}", "released on {d}", "liberado el {d}"],
  payoutsSentOn: ["PIX em {d}", "PIX on {d}", "PIX el {d}"],
  payoutsGross: ["Mensalidade", "Fee", "Mensualidad"],
  payoutsMpFee: ["Tarifa Mercado Pago", "Mercado Pago fee", "Tarifa Mercado Pago"],
  payoutsFlFee: ["Taxa Freelandoo", "Freelandoo fee", "Tasa Freelandoo"],
  payoutsNet: ["Você recebe", "You receive", "Recibes"],
  payoutWaiting: ["Aguardando", "Waiting", "En espera"],
  payoutReleased: ["Liberado", "Released", "Liberado"],
  payoutPaid: ["Pago", "Paid", "Pagado"],
  payoutReverted: ["Revertido", "Reverted", "Revertido"],
  payoutOwed: ["Devido", "Owed", "Adeudado"],
  pixTypeCpf: ["CPF", "CPF", "CPF"],
  pixTypeCnpj: ["CNPJ", "CNPJ", "CNPJ"],
  pixTypeEmail: ["E-mail", "Email", "Correo"],
  pixTypePhone: ["Celular", "Phone", "Celular"],
  pixTypeRandom: ["Chave aleatória", "Random key", "Clave aleatoria"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.Academies = json.Academies || {}
  for (const [key, vals] of Object.entries(ACADEMIES)) {
    if (json.Academies[key] === undefined) {
      json.Academies[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n academy payouts: ${added} chaves adicionadas`)
