// i18n /mensagens — merge das chaves que os componentes JÁ usavam via
// useTranslations("Messages"|"Conversation") mas que FALTAVAM no dicionário
// (en/es caíam no fallback pt) + chaves novas dos modais/listas de O.S. que
// estavam hardcoded em pt. Idempotente e não-destrutivo (fill-if-absent).
// Rodar: node scripts/i18n-mensagens-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MESSAGES = {
  openConversationError: ["Erro ao abrir conversa", "Error opening conversation", "Error al abrir la conversación"],
  deleteConversationConfirm: ["Excluir esta conversa? O histórico some dos dois lados. Sem volta.", "Delete this conversation? The history disappears for both sides. No undo.", "¿Eliminar esta conversación? El historial desaparece para ambos lados. Sin vuelta atrás."],
  deleteConversationError: ["Erro ao excluir conversa", "Error deleting conversation", "Error al eliminar la conversación"],
  deleteOsChatConfirm: ["Excluir esta conversa de O.S.? O histórico some dos dois lados. Sem volta.", "Delete this service-order chat? The history disappears for both sides. No undo.", "¿Eliminar este chat de O.S.? El historial desaparece para ambos lados. Sin vuelta atrás."],
  deleteOsChatError: ["Erro ao excluir conversa", "Error deleting conversation", "Error al eliminar la conversación"],
  openChamadoButtonTooltip: ["Abrir chamado", "Open a request", "Abrir solicitud"],
  openChamadoButtonLabel: ["Abrir chamado", "Open a request", "Abrir solicitud"],
  openChamadoMenuTitle: ["Que tipo de chamado?", "What kind of request?", "¿Qué tipo de solicitud?"],
  chamadoModeService: ["Serviço", "Service", "Servicio"],
  chamadoModeProduct: ["Produto", "Product", "Producto"],
  chamadoModeCourse: ["Curso", "Course", "Curso"],
  searchProfilesPlaceholder: ["Buscar @usuário ou nome", "Search @user or name", "Buscar @usuario o nombre"],
  clearSearchAria: ["Limpar busca", "Clear search", "Limpiar búsqueda"],
  searchProfilesEmpty: ["Nenhum perfil encontrado para essa busca.", "No profile found for this search.", "No se encontró ningún perfil para esta búsqueda."],
  userAccountLabel: ["Conta", "Account", "Cuenta"],
  deleteConversationAria: ["Excluir conversa", "Delete conversation", "Eliminar conversación"],
  openChamadoCtaHint: ["Abra um chamado e receba propostas aqui.", "Open a request and receive proposals here.", "Abre una solicitud y recibe propuestas aquí."],
  // Modal de detalhe de pedido de produto + lista de O.S.
  closeAriaLabel: ["Fechar", "Close", "Cerrar"],
  productDetailTitlePro: ["Pedido que você respondeu", "Request you answered", "Pedido que respondiste"],
  productDetailTitleOwn: ["Seu pedido de produto", "Your product request", "Tu pedido de producto"],
  noCategory: ["Sem categoria", "No category", "Sin categoría"],
  descriptionLabel: ["Descrição", "Description", "Descripción"],
  yourResponse: ["Sua resposta", "Your response", "Tu respuesta"],
  statusLabel: ["Status", "Status", "Estado"],
  productNoChatNote: ["Pedidos de produto não têm chat contínuo. A negociação acontece pelos contatos trocados na resposta.", "Product requests don't have an ongoing chat. Negotiation happens through the contacts shared in the response.", "Los pedidos de producto no tienen chat continuo. La negociación ocurre por los contactos intercambiados en la respuesta."],
  sideLabelResponded: ["Respondi", "I answered", "Respondí"],
  sideLabelRequested: ["Pedi", "I requested", "Pedí"],
  productRequestFallback: ["Pedido de produto", "Product request", "Pedido de producto"],
}

const CONVERSATION = {
  backToMessages: ["Voltar para mensagens", "Back to messages", "Volver a mensajes"],
  offeringProduct: ["Produto", "Product", "Producto"],
  offeringService: ["Serviço", "Service", "Servicio"],
  offeringCourse: ["Curso", "Course", "Curso"],
  attachOfferingTitle: ["Anexar produto, serviço ou curso", "Attach product, service or course", "Adjuntar producto, servicio o curso"],
  offeringPickProduct: ["Escolha um produto", "Choose a product", "Elige un producto"],
  offeringPickService: ["Escolha um serviço", "Choose a service", "Elige un servicio"],
  offeringPickCourse: ["Escolha um curso", "Choose a course", "Elige un curso"],
  closeAriaLabel: ["Fechar", "Close", "Cerrar"],
  offeringProductHint: ["Da loja dos seus subperfis", "From your subprofiles' shop", "De la tienda de tus subperfiles"],
  offeringServiceHint: ["Pacote de serviço pra agendar", "Service package to schedule", "Paquete de servicio para agendar"],
  offeringCourseHint: ["Seus cursos publicados", "Your published courses", "Tus cursos publicados"],
  offeringEmpty: ["Você ainda não tem itens deste tipo.", "You don't have items of this type yet.", "Aún no tienes elementos de este tipo."],
}

const GROUPS = { Messages: MESSAGES, Conversation: CONVERSATION }

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
