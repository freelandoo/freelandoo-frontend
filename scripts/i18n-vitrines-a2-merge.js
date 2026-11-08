// A2 + A3 + A4 (mig 338): chaves "Preciso de emprego/dívidas", abas Empregos e
// Dívidas das comunidades e o feed de boletos (/dividas).
// Fill-if-absent nos namespaces Vitrines e Community. Idempotente.
//   node scripts/i18n-vitrines-a2-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt, en, es]
const VITRINES = [
  ["dbCheckBeneficiary", "No app do banco, confira se o beneficiário é o mesmo daqui antes de pagar.", "In your bank app, check that the payee matches this one before paying.", "En la app del banco, verifica que el beneficiario sea el mismo antes de pagar."],
  ["dbCopy", "Copiar linha", "Copy code", "Copiar línea"],
  ["dbDisclaimer", "Ajuda voluntária entre pessoas. A Freelandoo não recebe nem repassa dinheiro e não garante que o boleto seja pago ou que a ajuda chegue. Pague só pelo app do seu banco e confira o beneficiário antes.", "Voluntary help between people. Freelandoo does not receive or transfer money and does not guarantee the bill will be paid or that the help arrives. Pay only through your bank app and check the payee first.", "Ayuda voluntaria entre personas. Freelandoo no recibe ni transfiere dinero y no garantiza que la boleta se pague ni que la ayuda llegue. Paga solo por la app de tu banco y verifica antes el beneficiario."],
  ["dbDue", "Vence em {d}", "Due {d}", "Vence el {d}"],
  ["dbEmpty", "Nenhum boleto esperando ajuda agora.", "No bills waiting for help right now.", "Ninguna boleta esperando ayuda ahora."],
  ["dbKindBank", "Boleto bancário", "Bank slip", "Boleta bancaria"],
  ["dbKindUtility", "Conta de consumo", "Utility bill", "Factura de servicios"],
  ["dbMine", "Este boleto é seu", "This bill is yours", "Esta boleta es tuya"],
  ["dbProofSent", "Comprovante enviado. Agora o dono confere no banco dele.", "Receipt sent. Now the owner checks it with their bank.", "Comprobante enviado. Ahora el dueño lo confirma en su banco."],
  ["dbRelease", "Desistir", "Give up", "Desistir"],
  ["dbReport", "Denunciar", "Report", "Denunciar"],
  ["dbReportPh", "O que há de errado com este boleto?", "What is wrong with this bill?", "¿Qué hay de malo con esta boleta?"],
  ["dbReported", "Denúncia enviada. A moderação vai conferir.", "Report sent. Moderation will review it.", "Denuncia enviada. La moderación la revisará."],
  ["dbReservedNow", "Reservado para você. Pague no app do seu banco.", "Reserved for you. Pay in your bank app.", "Reservada para ti. Paga en la app de tu banco."],
  ["dbReservedUntil", "Reservado para você até {h}. Pague no app do seu banco.", "Reserved for you until {h}. Pay in your bank app.", "Reservada para ti hasta las {h}. Paga en la app de tu banco."],
  ["dbSend", "Enviar", "Send", "Enviar"],
  ["dbSendProof", "Já paguei: enviar comprovante", "I paid: send receipt", "Ya pagué: enviar comprobante"],
  ["dbTaken", "Alguém está pagando agora", "Someone is paying it now", "Alguien la está pagando ahora"],
  ["dbWillPay", "Vou pagar", "I'll pay", "Voy a pagar"],
  ["debtsAll", "Feed do Brasil e meus boletos", "Nationwide feed and my bills", "Feed de todo Brasil y mis boletas"],
  ["debtsIntro", "Boletos de quem precisa de ajuda. Quem ajuda paga direto no app do próprio banco.", "Bills from people who need help. Helpers pay directly in their own bank app.", "Boletas de quien necesita ayuda. Quien ayuda paga directo en la app de su propio banco."],
  ["dvBeneficiary", "Beneficiário (quem recebe, como está no boleto)", "Payee (who receives it, as written on the bill)", "Beneficiario (quien recibe, como figura en la boleta)"],
  ["dvCancel", "Retirar", "Withdraw", "Retirar"],
  ["dvCancelForm", "Cancelar", "Cancel", "Cancelar"],
  ["dvConfirm", "Foi pago no meu banco", "It was paid at my bank", "Se pagó en mi banco"],
  ["dvConfirmed", "Confirmado. Obrigado por avisar quem ajudou!", "Confirmed. Thanks for letting your helper know!", "¡Confirmado. Gracias por avisar a quien ayudó!"],
  ["dvDueDate", "Vencimento (contas de consumo não trazem na linha)", "Due date (utility bills don't include it in the code)", "Vencimiento (las facturas de servicios no lo traen en la línea)"],
  ["dvHelpedCount", "Você já ajudou {n} pessoa(s).", "You have helped {n} person(s).", "Ya ayudaste a {n} persona(s)."],
  ["dvHelpingEmpty", "Nenhum boleto reservado ou esperando confirmação.", "No reserved bills or bills awaiting confirmation.", "Ninguna boleta reservada o esperando confirmación."],
  ["dvLimits", "Até {n} boletos abertos, de até {v} cada. Antes de ir para o feed, a moderação confere o beneficiário.", "Up to {n} open bills, up to {v} each. Moderation checks the payee before it goes to the feed.", "Hasta {n} boletas abiertas, de hasta {v} cada una. Antes de ir al feed, la moderación verifica el beneficiario."],
  ["dvLine", "Linha digitável (os números do boleto)", "Payment code (the bill's numbers)", "Línea digitable (los números de la boleta)"],
  ["dvMineEmpty", "Você ainda não postou boletos.", "You haven't posted any bills yet.", "Todavía no publicaste boletas."],
  ["dvNew", "Postar boleto", "Post bill", "Publicar boleta"],
  ["dvPosted", "Boleto enviado. Ele entra no feed depois da revisão.", "Bill sent. It goes to the feed after review.", "Boleta enviada. Entra al feed después de la revisión."],
  ["dvPrivacy", "Valor e vencimento são lidos da linha. Seu nome, CPF e endereço nunca aparecem, e a imagem do boleto não é publicada.", "Amount and due date are read from the code. Your name, CPF and address never appear, and the bill image is not published.", "El monto y el vencimiento se leen de la línea. Tu nombre, CPF y dirección nunca aparecen, y la imagen de la boleta no se publica."],
  ["dvReject", "Não caiu", "It didn't go through", "No se acreditó"],
  ["dvRejected", "Comprovante recusado. O boleto volta para o feed.", "Receipt rejected. The bill goes back to the feed.", "Comprobante rechazado. La boleta vuelve al feed."],
  ["dvReservedYou", "Reservado para você", "Reserved for you", "Reservada para ti"],
  ["dvSeeProof", "Ver comprovante", "See receipt", "Ver comprobante"],
  ["dvStCanceled", "Retirado por você", "Withdrawn by you", "Retirada por ti"],
  ["dvStClaimed", "Comprovante para conferir", "Receipt to check", "Comprobante para revisar"],
  ["dvStExpired", "Venceu", "Expired", "Vencida"],
  ["dvStOpen", "No feed", "In the feed", "En el feed"],
  ["dvStPaid", "Pago", "Paid", "Pagada"],
  ["dvStRemoved", "Retirado pela moderação", "Removed by moderation", "Retirada por la moderación"],
  ["dvStReserved", "Alguém está pagando", "Someone is paying", "Alguien la está pagando"],
  ["dvStReview", "Em revisão", "Under review", "En revisión"],
  ["dvSubmit", "Enviar para revisão", "Send for review", "Enviar a revisión"],
  ["dvSubtitle", "Pessoas de todo o Brasil pedindo ajuda para pagar uma conta. Quem ajuda paga direto no app do próprio banco.", "People from all over Brazil asking for help paying a bill. Helpers pay directly in their own bank app.", "Personas de todo Brasil pidiendo ayuda para pagar una cuenta. Quien ayuda paga directo en la app de su propio banco."],
  ["dvTabFeed", "Precisam de ajuda", "Need help", "Necesitan ayuda"],
  ["dvTabHelping", "Estou ajudando", "I'm helping", "Estoy ayudando"],
  ["dvTabMine", "Meus boletos", "My bills", "Mis boletas"],
  ["dvTitle", "Ajuda com boletos", "Help with bills", "Ayuda con boletas"],
  ["dvWaitOwner", "Comprovante enviado: esperando o dono confirmar", "Receipt sent: waiting for the owner to confirm", "Comprobante enviado: esperando que el dueño confirme"],
  ["jobsContact", "Ver perfil e chamar", "View profile and contact", "Ver perfil y contactar"],
  ["jobsEmpty", "Ninguém procurando emprego aqui por enquanto.", "No one looking for work here yet.", "Nadie buscando empleo aquí por ahora."],
  ["jobsIntro", "Pessoas que procuram trabalho. Quem está perto aparece primeiro. Para contratar, mande uma mensagem.", "People looking for work. Those nearby appear first. To hire, send a message.", "Personas que buscan trabajo. Quien está cerca aparece primero. Para contratar, envía un mensaje."],
  ["jobsMeToo", "Também procuro emprego", "I'm looking for work too", "También busco empleo"],
  ["loadMore", "Carregar mais", "Load more", "Cargar más"],
  ["ndDebt", "Preciso pagar dívidas", "I need to pay debts", "Necesito pagar deudas"],
  ["ndDebtFeed", "Abrir o feed de boletos", "Open the bills feed", "Abrir el feed de boletas"],
  ["ndDebtReq", "Para postar boletos é preciso ter 18 anos ou mais e o CPF cadastrado.", "To post bills you must be 18 or older and have your CPF registered.", "Para publicar boletas hay que tener 18 años o más y el CPF registrado."],
  ["ndDebtText", "Libera postar boletos no feed de ajuda. Quem quiser ajudar paga direto no app do banco.", "Lets you post bills on the help feed. Anyone who wants to help pays directly in their bank app.", "Permite publicar boletas en el feed de ayuda. Quien quiera ayudar paga directo en la app del banco."],
  ["ndHelped", "Você já ajudou {n} pessoa(s).", "You have helped {n} person(s).", "Ya ayudaste a {n} persona(s)."],
  ["ndJob", "Preciso de emprego", "I need a job", "Necesito empleo"],
  ["ndJobAge", "Disponível a partir dos 16 anos (confira sua data de nascimento).", "Available from age 16 (check your date of birth).", "Disponible desde los 16 años (verifica tu fecha de nacimiento)."],
  ["ndJobText", "Seu perfil aparece na aba Empregos das comunidades. Quem quer contratar te chama por mensagem.", "Your profile appears in the communities' Jobs tab. Anyone who wants to hire contacts you by message.", "Tu perfil aparece en la pestaña Empleos de las comunidades. Quien quiera contratar te escribe por mensaje."],
  ["ndPitchPh", "Em uma frase: o que você faz e o que procura.", "In one sentence: what you do and what you're looking for.", "En una frase: qué haces y qué buscas."],
  ["ndSave", "Salvar", "Save", "Guardar"],
  ["ndSaved", "Salvo.", "Saved.", "Guardado."],
  ["ndSubtitle", "Ligue o que você precisa. Dá para desligar a qualquer momento.", "Turn on what you need. You can turn it off at any time.", "Activa lo que necesitas. Puedes desactivarlo cuando quieras."],
  ["ndTitle", "Preciso de ajuda", "I need help", "Necesito ayuda"],
  ["someone", "Alguém", "Someone", "Alguien"],
]

const COMMUNITY = [
  ["tabJobs", "Empregos", "Jobs", "Empleos"],
  ["tabDebts", "Dívidas", "Debts", "Deudas"],
]

const LOCALES = ["pt-BR", "en", "es"]
for (const [i, loc] of LOCALES.entries()) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  let n = 0
  for (const [ns, rows] of [["Vitrines", VITRINES], ["Community", COMMUNITY]]) {
    const d = (dict[ns] = dict[ns] || {})
    for (const row of rows) {
      if (typeof d[row[0]] !== "string") {
        d[row[0]] = row[1 + i]
        n++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
