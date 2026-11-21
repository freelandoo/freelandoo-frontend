// Carteira: bancos conectados (Open Finance pela Malvo, mig 462) + extrato
// OFX/CSV. Namespace Wallet. Idempotente (fill-if-absent).
//   node scripts/i18n-wallet-banks-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ROWS = {
  bkTitle: ["Seus bancos", "Your banks", "Tus bancos"],
  bkIntro: [
    "Conecte o banco e o extrato entra sozinho na Vida Financeira, já com categoria. Ou importe o arquivo OFX/CSV do app do banco, de graça.",
    "Connect your bank and your statement flows into Financial Life on its own, already categorized. Or import the OFX/CSV file from your bank's app for free.",
    "Conecta tu banco y el extracto entra solo en Vida Financiera, ya con categoría. O importa el archivo OFX/CSV de la app de tu banco, gratis.",
  ],
  bkIntroImport: [
    "Baixe o extrato OFX ou CSV no app do seu banco e importe aqui: entra tudo na Vida Financeira, sem duplicar.",
    "Download the OFX or CSV statement from your bank's app and import it here: everything goes into Financial Life, with no duplicates.",
    "Descarga el extracto OFX o CSV en la app de tu banco e impórtalo aquí: todo entra en Vida Financiera, sin duplicados.",
  ],
  bkImport: ["Importar extrato", "Import statement", "Importar extracto"],
  bkImportTooBig: ["Arquivo grande demais (máx. 3 MB).", "File too large (max 3 MB).", "Archivo demasiado grande (máx. 3 MB)."],
  bkImported: [
    "{n} lançamento(s) importado(s); {d} já estava(m) na Vida Financeira.",
    "{n} entry(ies) imported; {d} were already in Financial Life.",
    "{n} movimiento(s) importado(s); {d} ya estaba(n) en Vida Financiera.",
  ],
  bkConnect: ["Conectar banco", "Connect bank", "Conectar banco"],
  bkWidgetTitle: ["Conectar banco", "Connect bank", "Conectar banco"],
  bkConnected: [
    "Banco conectado. Puxando o extrato — leva alguns segundos.",
    "Bank connected. Fetching your statement — it takes a few seconds.",
    "Banco conectado. Trayendo el extracto — tarda unos segundos.",
  ],
  bkGenericError: ["Não deu certo agora. Tente de novo.", "That didn't work. Try again.", "No funcionó. Inténtalo de nuevo."],
  bkPaid: [
    "Pagamento recebido. Liberando os bancos conectados…",
    "Payment received. Unlocking connected banks…",
    "Pago recibido. Activando los bancos conectados…",
  ],
  bkPayCanceled: ["Pagamento não concluído.", "Payment not completed.", "Pago no completado."],
  bkOffer: ["{price}/mês · até {n} bancos", "{price}/month · up to {n} banks", "{price}/mes · hasta {n} bancos"],
  bkOfferDesc: [
    "Open Finance regulado pelo Banco Central: você autoriza no app do seu banco, só leitura, e pode revogar quando quiser. A Freelandoo nunca vê sua senha.",
    "Open Finance regulated by Brazil's Central Bank: you authorize it in your bank's app, read-only, and can revoke it anytime. Freelandoo never sees your password.",
    "Open Finance regulado por el Banco Central de Brasil: autorizas en la app de tu banco, solo lectura, y puedes revocarlo cuando quieras. Freelandoo nunca ve tu contraseña.",
  ],
  bkPayCard: ["Assinar no cartão", "Subscribe by card", "Suscribirse con tarjeta"],
  bkPayPix: ["1 mês no Pix", "1 month via Pix", "1 mes por Pix"],
  bkNotForSale: ["A assinatura abre em breve.", "Subscriptions open soon.", "La suscripción abre pronto."],
  bkByAdmin: ["Acesso de administrador", "Administrator access", "Acceso de administrador"],
  bkRenews: ["Renova em {date}", "Renews on {date}", "Se renueva el {date}"],
  bkUntil: ["Liberado até {date}", "Active until {date}", "Activo hasta el {date}"],
  bkBanksCount: ["{n} de {max} bancos", "{n} of {max} banks", "{n} de {max} bancos"],
  bkMonthLimit: ["limite de conexões do mês atingido", "monthly connection limit reached", "límite de conexiones del mes alcanzado"],
  bkCancel: ["cancelar renovação", "cancel renewal", "cancelar renovación"],
  bkCancelConfirm: [
    "Cancelar a renovação? Os bancos seguem conectados até o fim do mês pago.",
    "Cancel the renewal? Your banks stay connected until the end of the paid month.",
    "¿Cancelar la renovación? Los bancos siguen conectados hasta el fin del mes pagado.",
  ],
  bkThisBank: ["este banco", "this bank", "este banco"],
  bkDisconnect: ["Desconectar", "Disconnect", "Desconectar"],
  bkDisconnectConfirm: [
    "Desconectar {bank}? O consentimento é revogado e os lançamentos que vieram dele saem da Vida Financeira.",
    "Disconnect {bank}? The consent is revoked and the entries that came from it leave Financial Life.",
    "¿Desconectar {bank}? El consentimiento se revoca y los movimientos que vinieron de él salen de Vida Financiera.",
  ],
  bkBank: ["Banco", "Bank", "Banco"],
  bkTest: ["Teste", "Test", "Prueba"],
  bkSyncing: ["sincronizando", "syncing", "sincronizando"],
  bkSyncedAt: ["atualizado {date}", "updated {date}", "actualizado {date}"],
  bkWaiting: ["aguardando o banco", "waiting for the bank", "esperando al banco"],
  bkNeedsAction: [
    "A autorização venceu ou o banco pediu confirmação.",
    "The authorization expired or the bank asked for confirmation.",
    "La autorización venció o el banco pidió confirmación.",
  ],
  bkReconnect: ["Reconectar", "Reconnect", "Reconectar"],
  bkCard: ["Cartão", "Card", "Tarjeta"],
  bkAccount: ["Conta", "Account", "Cuenta"],
  bkBillDue: ["fatura vence {date}", "bill due {date}", "la factura vence el {date}"],
  bkBill: ["fatura", "bill", "factura"],
  bkBalance: ["saldo", "balance", "saldo"],
  bankTag: ["Banco", "Bank", "Banco"],
  ofxTag: ["Extrato", "Statement", "Extracto"],
}
const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const ns = (dict.Wallet = dict.Wallet || {})
  let added = 0
  for (const [k, v] of Object.entries(ROWS)) if (!(k in ns)) { ns[k] = v[i]; added++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(`${loc}: +${added}`)
})
