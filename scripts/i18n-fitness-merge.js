// i18n de Fitness & Academias: ns "Academies" (fase 1). Fases 2-4 ADICIONAM
// chaves aqui mesmo (Fitness/Workouts). Idempotente e não-destrutivo: só
// adiciona chaves ausentes. Rodar com: node scripts/i18n-fitness-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACADEMIES = {
  eyebrow: ["Fitness · Freelandoo", "Fitness · Freelandoo", "Fitness · Freelandoo"],
  title: ["Academias", "Gyms", "Gimnasios"],
  subtitle: [
    "Vincule sua matrícula pelo CPF e acompanhe frequência, treinos e calorias no seu painel fitness.",
    "Link your membership with your CPF and track attendance, workouts and calories in your fitness panel.",
    "Vincula tu matrícula con el CPF y sigue asistencia, entrenamientos y calorías en tu panel fitness.",
  ],
  registerCta: ["Cadastrar minha academia", "Register my gym", "Registrar mi gimnasio"],
  searchPlaceholder: ["Buscar academia pelo nome", "Search gym by name", "Buscar gimnasio por nombre"],
  cityPlaceholder: ["Cidade", "City", "Ciudad"],
  searchCta: ["Buscar", "Search", "Buscar"],
  loadError: ["Erro ao carregar as academias. Tente novamente.", "Error loading gyms. Try again.", "Error al cargar los gimnasios. Inténtalo de nuevo."],
  empty: [
    "Nenhuma academia encontrada. Cadastre a sua ou ajuste a busca.",
    "No gyms found. Register yours or adjust the search.",
    "No se encontraron gimnasios. Registra el tuyo o ajusta la búsqueda.",
  ],
  cityUnknown: ["Cidade não informada", "City not provided", "Ciudad no informada"],
  membersSuffix: ["vinculados", "linked members", "vinculados"],
  disabled: ["Recurso indisponível no momento.", "Feature unavailable right now.", "Recurso no disponible por ahora."],
  loginRequired: [
    "Entre na sua conta para cadastrar uma academia.",
    "Sign in to register a gym.",
    "Inicia sesión para registrar un gimnasio.",
  ],
  createTitle: ["Cadastrar academia", "Register gym", "Registrar gimnasio"],
  createIntro: [
    "Grátis. Informe a URL e o token da API do software da sua academia (Gym Provider API) — é por ela que puxamos catraca e pagamentos.",
    "Free. Enter the URL and token of your gym software's API (Gym Provider API) — that's how we pull turnstile and payment data.",
    "Gratis. Ingresa la URL y el token de la API del software de tu gimnasio (Gym Provider API): por ahí traemos torniquete y pagos.",
  ],
  createMissing: ["Preencha nome, URL da API e token.", "Fill in name, API URL and token.", "Completa nombre, URL de la API y token."],
  createOk: ["Academia cadastrada!", "Gym registered!", "¡Gimnasio registrado!"],
  createError: ["Erro ao cadastrar academia", "Error registering gym", "Error al registrar el gimnasio"],
  createSubmit: ["Cadastrar", "Register", "Registrar"],
  fieldName: ["Nome da academia", "Gym name", "Nombre del gimnasio"],
  fieldCity: ["Cidade", "City", "Ciudad"],
  fieldDescription: ["Descrição", "Description", "Descripción"],
  fieldApiUrl: ["URL da API (Gym Provider)", "API URL (Gym Provider)", "URL de la API (Gym Provider)"],
  fieldApiToken: ["Token da API", "API token", "Token de la API"],
  providerHint: [
    "Seu software precisa expor a Gym Provider API. O Coliseu já é compatível; outros softwares podem implementar o contrato público.",
    "Your software must expose the Gym Provider API. Coliseu is already compatible; other systems can implement the public contract.",
    "Tu software debe exponer la Gym Provider API. Coliseu ya es compatible; otros sistemas pueden implementar el contrato público.",
  ],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  close: ["Fechar", "Close", "Cerrar"],
  notFound: ["Academia não encontrada.", "Gym not found.", "Gimnasio no encontrado."],
  backToList: ["Ver academias", "See gyms", "Ver gimnasios"],
  statusActive: ["Matrícula ativa", "Active membership", "Matrícula activa"],
  statusOverdue: ["Mensalidade atrasada", "Payment overdue", "Mensualidad atrasada"],
  statusCanceled: ["Matrícula cancelada", "Membership canceled", "Matrícula cancelada"],
  statusExpired: ["Matrícula vencida", "Membership expired", "Matrícula vencida"],
  statusPending: ["Matrícula pendente", "Membership pending", "Matrícula pendiente"],
  linkedSince: ["Vinculado desde", "Linked since", "Vinculado desde"],
  goFitness: ["Meu painel fitness", "My fitness panel", "Mi panel fitness"],
  linkCta: ["Vincular matrícula (CPF)", "Link membership (CPF)", "Vincular matrícula (CPF)"],
  linkTitle: ["Vincular matrícula", "Link membership", "Vincular matrícula"],
  linkIntro: [
    "Digite o CPF cadastrado na academia. Vamos confirmar sua matrícula direto no sistema dela — na hora.",
    "Enter the CPF registered at the gym. We'll confirm your membership directly in their system — instantly.",
    "Escribe el CPF registrado en el gimnasio. Confirmaremos tu matrícula directo en su sistema, al instante.",
  ],
  cpfLabel: ["CPF", "CPF", "CPF"],
  linkSubmit: ["Vincular", "Link", "Vincular"],
  linkOk: [
    "Matrícula vinculada! Seu painel fitness está liberado.",
    "Membership linked! Your fitness panel is unlocked.",
    "¡Matrícula vinculada! Tu panel fitness está desbloqueado.",
  ],
  linkError: ["Não foi possível vincular o CPF", "Could not link this CPF", "No se pudo vincular el CPF"],
  unlinkCta: ["Desvincular", "Unlink", "Desvincular"],
  unlinkConfirm: [
    "Desvincular sua matrícula desta academia?",
    "Unlink your membership from this gym?",
    "¿Desvincular tu matrícula de este gimnasio?",
  ],
  unlinkOk: ["Vínculo removido.", "Link removed.", "Vínculo eliminado."],
  unlinkError: ["Erro ao desvincular", "Error unlinking", "Error al desvincular"],
  professorsTitle: ["Professores", "Trainers", "Profesores"],
  professorsEmpty: ["Nenhum professor cadastrado ainda.", "No trainers registered yet.", "Ningún profesor registrado aún."],
  professorBadge: ["Prof", "Coach", "Prof"],
  professorAdded: ["Professor promovido!", "Trainer promoted!", "¡Profesor promovido!"],
  professorRemoved: ["Professor removido.", "Trainer removed.", "Profesor eliminado."],
  professorError: ["Erro ao atualizar professor", "Error updating trainer", "Error al actualizar profesor"],
  promoteCta: ["Promover", "Promote", "Promover"],
  demoteCta: ["Remover", "Remove", "Quitar"],
  ownerPanelTitle: [
    "Gestão — conexão com o software da academia",
    "Management — gym software connection",
    "Gestión — conexión con el software del gimnasio",
  ],
  ownerApiUrl: ["URL da API", "API URL", "URL de la API"],
  ownerSyncStatus: ["Status do sync", "Sync status", "Estado del sync"],
  ownerLastSync: ["Última sincronização", "Last sync", "Última sincronización"],
  testCta: ["Testar conexão", "Test connection", "Probar conexión"],
  testOk: ["Conexão OK — a API da academia respondeu.", "Connection OK — the gym API responded.", "Conexión OK: la API del gimnasio respondió."],
  testError: ["Falha no teste de conexão", "Connection test failed", "Falló la prueba de conexión"],
  syncCta: ["Sincronizar agora", "Sync now", "Sincronizar ahora"],
  syncOk: ["Sincronização executada.", "Sync executed.", "Sincronización ejecutada."],
  syncError: ["Falha na sincronização", "Sync failed", "Falló la sincronización"],
  membersTitle: ["Membros vinculados", "Linked members", "Miembros vinculados"],
  membersEmpty: [
    "Ninguém vinculou a matrícula ainda. Divulgue a página da academia!",
    "No one has linked a membership yet. Share the gym page!",
    "Nadie ha vinculado su matrícula aún. ¡Comparte la página del gimnasio!",
  ],
  colMember: ["Membro", "Member", "Miembro"],
  colStatus: ["Status", "Status", "Estado"],
  colPlan: ["Plano", "Plan", "Plan"],
  colLinked: ["Vínculo", "Linked", "Vínculo"],
  colProfessor: ["Professor", "Trainer", "Profesor"],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
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

const NAMESPACES = [["Academies", ACADEMIES]]

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  for (const [ns, keys] of NAMESPACES) added += mergeNamespace(json, ns, keys, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
