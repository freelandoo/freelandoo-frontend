// Namespace "Vaquinha" — página pública + criação. Idempotente, fill-if-absent.
//   node scripts/i18n-vaquinha-merge.js
const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", "messages")

const V = {
  back: ["Voltar", "Back", "Volver"],
  backHome: ["Voltar ao início", "Back home", "Volver al inicio"],
  notFound: ["Vaquinha não encontrada", "Campaign not found", "Vaquita no encontrada"],
  ended: ["Encerrada", "Ended", "Cerrada"],
  finished: ["finalizada", "finished", "finalizada"],
  edit: ["Editar", "Edit", "Editar"],
  close: ["Encerrar", "Close", "Cerrar"],
  raised: ["Arrecadado", "Raised", "Recaudado"],
  goal: ["Meta", "Goal", "Meta"],
  ofGoal: ["da meta", "of goal", "de la meta"],
  donors: ["doadores", "donors", "donantes"],
  daysLeft: ["dias restantes", "days left", "días restantes"],
  donate: ["Doar", "Donate", "Donar"],
  endedHint: ["Esta vaquinha não está mais recebendo doações.", "This campaign is no longer accepting donations.", "Esta vaquita ya no recibe donaciones."],
  about: ["Sobre a campanha", "About the campaign", "Sobre la campaña"],
  recentDonors: ["Doações recentes", "Recent donations", "Donaciones recientes"],
  noDonors: ["Seja o primeiro a doar.", "Be the first to donate.", "Sé el primero en donar."],
  donateTo: ["Doar para", "Donate to", "Donar a"],
  minLabel: ["Mínimo", "Minimum", "Mínimo"],
  minError: ["Valor abaixo do mínimo.", "Amount below minimum.", "Monto por debajo del mínimo."],
  otherAmount: ["Outro valor (R$)", "Other amount (R$)", "Otro monto (R$)"],
  yourName: ["Seu nome (opcional)", "Your name (optional)", "Tu nombre (opcional)"],
  anon: ["Anônimo", "Anonymous", "Anónimo"],
  messageLabel: ["Mensagem (opcional)", "Message (optional)", "Mensaje (opcional)"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  continueToPay: ["Ir para o pagamento", "Go to payment", "Ir al pago"],
  donateError: ["Não foi possível iniciar a doação.", "Could not start the donation.", "No se pudo iniciar la donación."],
  thanksTitle: ["Obrigado pela sua doação!", "Thank you for your donation!", "¡Gracias por tu donación!"],
  thanksBody: ["Pode levar alguns segundos para aparecer no contador.", "It may take a few seconds to show in the counter.", "Puede tardar unos segundos en aparecer en el contador."],
  canceled: ["Doação cancelada.", "Donation canceled.", "Donación cancelada."],
  confirmClose: ["Encerrar esta vaquinha? Ela para de receber doações.", "Close this campaign? It will stop receiving donations.", "¿Cerrar esta vaquita? Dejará de recibir donaciones."],
  closed: ["Vaquinha encerrada.", "Campaign closed.", "Vaquita cerrada."],
  closeError: ["Falha ao encerrar.", "Failed to close.", "Error al cerrar."],
  // Criação
  crowdfunding: ["vaquinha", "crowdfunding", "vaquita"],
  newTitle: ["Nova vaquinha", "New campaign", "Nueva vaquita"],
  editTitle: ["Editar vaquinha", "Edit campaign", "Editar vaquita"],
  intro: ["Crie uma campanha de doação. Meta e prazo obrigatórios (máx. 90 dias). O que for doado cai no seu Saldo.", "Create a donation campaign. Goal and deadline required (max 90 days). Donations go to your Balance.", "Crea una campaña de donación. Meta y plazo obligatorios (máx. 90 días). Lo donado va a tu Saldo."],
  loading: ["Carregando…", "Loading…", "Cargando…"],
  alreadyHave: ["Você já tem uma vaquinha ativa", "You already have an active campaign", "Ya tienes una vaquita activa"],
  alreadyHaveHint: ["Só é possível ter uma por vez. Encerre a atual para criar outra.", "Only one at a time. Close the current one to create another.", "Solo una a la vez. Cierra la actual para crear otra."],
  openMine: ["Abrir minha vaquinha", "Open my campaign", "Abrir mi vaquita"],
  fTitle: ["Título da campanha", "Campaign title", "Título de la campaña"],
  fTitlePh: ["Ex.: Ajuda para o tratamento da Ana", "e.g. Help for Ana's treatment", "Ej.: Ayuda para el tratamiento de Ana"],
  fBio: ["Sobre a campanha", "About the campaign", "Sobre la campaña"],
  fBioPh: ["Conte a história, para que serve a arrecadação…", "Tell the story, what the funds are for…", "Cuenta la historia, para qué es la recaudación…"],
  fGoal: ["Meta (R$)", "Goal (R$)", "Meta (R$)"],
  fDeadline: ["Prazo (máx. 90 dias)", "Deadline (max 90 days)", "Plazo (máx. 90 días)"],
  createCta: ["Criar vaquinha", "Create campaign", "Crear vaquita"],
  saveChanges: ["Salvar alterações", "Save changes", "Guardar cambios"],
  titleRequired: ["Dê um título à campanha.", "Give the campaign a title.", "Ponle un título a la campaña."],
  goalRequired: ["Defina uma meta válida.", "Set a valid goal.", "Define una meta válida."],
  deadlineRequired: ["Defina o prazo.", "Set the deadline.", "Define el plazo."],
  created: ["Vaquinha criada!", "Campaign created!", "¡Vaquita creada!"],
  saved: ["Alterações salvas.", "Changes saved.", "Cambios guardados."],
  saveError: ["Não foi possível salvar.", "Could not save.", "No se pudo guardar."],
  // Publicações
  updates: ["Publicações", "Updates", "Publicaciones"],
  kindText: ["Texto", "Text", "Texto"],
  kindPost: ["Foto", "Photo", "Foto"],
  kindBee: ["Bee", "Bee", "Bee"],
  noPosts: ["Nenhuma publicação ainda.", "No updates yet.", "Aún no hay publicaciones."],
  writePh: ["Escreva uma atualização…", "Write an update…", "Escribe una actualización…"],
  captionPh: ["Legenda (opcional)…", "Caption (optional)…", "Leyenda (opcional)…"],
  pickPhoto: ["Escolher foto", "Choose photo", "Elegir foto"],
  pickVideo: ["Escolher vídeo", "Choose video", "Elegir video"],
  pickMedia: ["Selecione uma mídia.", "Select a media file.", "Selecciona un archivo."],
  writeSomething: ["Escreva algo.", "Write something.", "Escribe algo."],
  publish: ["Publicar", "Publish", "Publicar"],
  posted: ["Publicado!", "Published!", "¡Publicado!"],
  postError: ["Não foi possível publicar.", "Could not publish.", "No se pudo publicar."],
  delete: ["Apagar", "Delete", "Eliminar"],
  confirmDeletePost: ["Apagar esta publicação?", "Delete this post?", "¿Eliminar esta publicación?"],
  deleteError: ["Falha ao apagar.", "Failed to delete.", "Error al eliminar."],
  // Edição "na própria pele" (inline)
  startError: ["Não foi possível abrir sua vaquinha.", "Could not open your campaign.", "No se pudo abrir tu vaquita."],
  saving: ["Salvando…", "Saving…", "Guardando…"],
  editHint: ["Sua vaquinha está no ar · edite tudo aqui", "Your campaign is live · edit everything here", "Tu vaquita está en el aire · edita todo aquí"],
  titlePlaceholder: ["Nome da sua campanha", "Your campaign name", "Nombre de tu campaña"],
  bioPlaceholder: ["Conte a história: para que serve a arrecadação, quem é ajudado, como o dinheiro será usado…", "Tell the story: what the funds are for, who is helped, how the money will be used…", "Cuenta la historia: para qué es la recaudación, a quién ayuda, cómo se usará el dinero…"],
  deadlineLabel: ["Prazo", "Deadline", "Plazo"],
  deadlineHint: ["Máx. 90 dias", "Max 90 days", "Máx. 90 días"],
  changeCover: ["Trocar capa", "Change cover", "Cambiar portada"],
  addCover: ["Adicionar capa", "Add cover", "Añadir portada"],
  coverUpdated: ["Capa atualizada!", "Cover updated!", "¡Portada actualizada!"],
  coverError: ["Não foi possível enviar a capa.", "Could not upload the cover.", "No se pudo subir la portada."],
}

// Bolsa Patrocínio (mig 174 / slice B2): kind toggle + patrocínio mensal.
Object.assign(V, {
  kindLabel: ["Tipo", "Type", "Tipo"],
  kindVaquinha: ["Vaquinha", "Fundraiser", "Vaquita"],
  kindBolsa: ["Bolsa Patrocínio", "Sponsorship Fund", "Beca de Patrocinio"],
  kindVaquinhaHint: [
    "Vaquinha: doações únicas com meta e prazo.",
    "Fundraiser: one-time donations with a goal and deadline.",
    "Vaquita: donaciones únicas con meta y plazo.",
  ],
  kindBolsaHint: [
    "Bolsa: sem prazo — patrocinadores apoiam com um valor mensal recorrente.",
    "Fund: no deadline — sponsors support with a recurring monthly amount.",
    "Beca: sin plazo — los patrocinadores apoyan con un monto mensual recurrente.",
  ],
  kindSwitchedBolsa: [
    "Agora é uma Bolsa Patrocínio — sem prazo, apoio mensal.",
    "It's now a Sponsorship Fund — no deadline, monthly support.",
    "Ahora es una Beca de Patrocinio — sin plazo, apoyo mensual.",
  ],
  kindSwitchedVaquinha: [
    "Agora é uma Vaquinha — doações únicas com prazo.",
    "It's now a Fundraiser — one-time donations with a deadline.",
    "Ahora es una Vaquita — donaciones únicas con plazo.",
  ],
  supporters: ["apoiadores", "supporters", "apoyadores"],
  perMonthShort: ["mês", "mo", "mes"],
  noDeadline: ["sem prazo", "no deadline", "sin plazo"],
  sponsorCta: ["Patrocinar mensalmente", "Sponsor monthly", "Patrocinar mensualmente"],
  sponsorTo: ["Patrocinar", "Sponsor", "Patrocinar"],
  sponsorMonthlyNote: [
    "Cobrança recorrente todo mês. Cancele quando quiser.",
    "Recurring charge every month. Cancel anytime.",
    "Cobro recurrente cada mes. Cancela cuando quieras.",
  ],
  otherMonthlyAmount: ["Outro valor mensal (R$)", "Other monthly amount (R$)", "Otro monto mensual (R$)"],
  sponsorLogin: [
    "Entre na sua conta para patrocinar.",
    "Sign in to sponsor.",
    "Inicia sesión para patrocinar.",
  ],
  sponsorError: [
    "Não foi possível iniciar o patrocínio.",
    "Could not start the sponsorship.",
    "No se pudo iniciar el patrocinio.",
  ],
  sponsorThanksTitle: ["Patrocínio confirmado!", "Sponsorship confirmed!", "¡Patrocinio confirmado!"],
  sponsorThanksBody: [
    "Obrigado por apoiar todo mês. Pode levar alguns segundos para aparecer.",
    "Thanks for supporting every month. It may take a few seconds to show up.",
    "Gracias por apoyar cada mes. Puede tardar unos segundos en aparecer.",
  ],
  sponsorCanceledCheckout: [
    "Patrocínio cancelado — você não foi cobrado.",
    "Sponsorship canceled — you were not charged.",
    "Patrocinio cancelado — no se te cobró.",
  ],
  youSponsor: ["Você patrocina esta bolsa", "You sponsor this fund", "Tú patrocinas esta beca"],
  pastDue: ["Pagamento pendente", "Payment past due", "Pago pendiente"],
  sponsorCancel: ["Cancelar patrocínio", "Cancel sponsorship", "Cancelar patrocinio"],
  sponsorCancelConfirm: [
    "Cancelar seu patrocínio mensal? O mês já pago não é estornado.",
    "Cancel your monthly sponsorship? The month already paid is not refunded.",
    "¿Cancelar tu patrocinio mensual? El mes ya pagado no se reembolsa.",
  ],
  sponsorCanceled: ["Patrocínio cancelado.", "Sponsorship canceled.", "Patrocinio cancelado."],
  sponsorCancelError: ["Não foi possível cancelar.", "Could not cancel.", "No se pudo cancelar."],
  sponsorsTitle: ["Patrocinadores", "Sponsors", "Patrocinadores"],
  noSponsors: ["Seja o primeiro a patrocinar.", "Be the first to sponsor.", "Sé el primero en patrocinar."],
  sponsorSince: ["Apoia desde", "Supporting since", "Apoya desde"],
  recentPayments: ["Apoios recentes", "Recent support", "Apoyos recientes"],
  bolsaEndedHint: [
    "Esta bolsa não está mais recebendo patrocínios.",
    "This fund is no longer accepting sponsorships.",
    "Esta beca ya no recibe patrocinios.",
  ],
})

// Entrada no menu (ns Account, reusa o vocabulário da conta).
const ACCOUNT = {
  vaquinhaLabel: ["Vaquinha", "Fundraiser", "Vaquita"],
}

function load(f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }
function save(f, o) { fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + "\n", "utf8") }
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  if (!d.Vaquinha) d.Vaquinha = {}
  if (!d.Account) d.Account = {}
  let added = 0
  for (const [k, vals] of Object.entries(V)) if (!(k in d.Vaquinha)) { d.Vaquinha[k] = vals[idx]; added++ }
  for (const [k, vals] of Object.entries(ACCOUNT)) if (!(k in d.Account)) { d.Account[k] = vals[idx]; added++ }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
