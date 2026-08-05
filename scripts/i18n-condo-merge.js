// i18n do Condomínio (migs 196-199): namespace novo `Condo` (tela do
// condomínio + modal de enquete), mais as chaves de modalidade que entram nos
// namespaces já existentes (Community e Notifications).
// Idempotente e não-destrutivo (fill-if-absent). Rodar: node scripts/i18n-condo-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// ─── Namespace novo: a tela do condomínio ────────────────────────────────────
const CONDO = {
  back: ["Comunidades", "Communities", "Comunidades"],
  kindLabel: ["Condomínio", "Building", "Condominio"],
  residentsCount: ["moradores", "residents", "residentes"],
  addressHidden: [
    "O endereço completo só aparece para moradores confirmados.",
    "The full address is only shown to confirmed residents.",
    "La dirección completa solo aparece para residentes confirmados.",
  ],

  // Portaria / reivindicação
  claimTitle: ["Você mora aqui?", "Do you live here?", "¿Vives aquí?"],
  claimSubtitle: [
    "Informe seu bloco e apartamento para entrar no condomínio. Se a unidade já estiver com outra pessoa, a administração decide.",
    "Enter your block and apartment to join. If the unit already belongs to someone else, the building admin decides.",
    "Indica tu bloque y departamento para entrar. Si la unidad ya es de otra persona, decide la administración.",
  ],
  claimCta: ["Reivindicar", "Claim", "Reclamar"],
  claimNeedsNumber: ["Informe o número do apartamento.", "Enter the apartment number.", "Indica el número del departamento."],
  claimApproved: ["Pronto! Apartamento confirmado.", "Done! Apartment confirmed.", "¡Listo! Departamento confirmado."],
  claimPending: [
    "Este apartamento já tem morador. A administração vai decidir.",
    "This apartment already has a resident. The building admin will decide.",
    "Este departamento ya tiene residente. La administración decidirá.",
  ],
  claimWaiting: [
    "Sua reivindicação está aguardando a administração.",
    "Your claim is waiting for the building admin.",
    "Tu reclamo está esperando a la administración.",
  ],
  claimError: ["Não foi possível reivindicar.", "Could not claim.", "No se pudo reclamar."],
  blockPlaceholder: ["Bloco (opcional)", "Block (optional)", "Bloque (opcional)"],
  unitPlaceholder: ["Apartamento", "Apartment", "Departamento"],

  // Abas
  tabMural: ["Mural", "Board", "Muro"],
  tabServices: ["Serviços", "Services", "Servicios"],
  tabProducts: ["Produtos", "Products", "Productos"],
  tabPolls: ["Enquetes", "Polls", "Encuestas"],
  tabResidents: ["Moradores", "Residents", "Residentes"],
  tabAdmin: ["Administração", "Admin", "Administración"],

  // Avisos
  newNotice: ["Novo aviso", "New notice", "Nuevo aviso"],
  scopeGeneral: ["Geral", "General", "General"],
  scopeUnit: ["Para um apartamento", "To an apartment", "Para un departamento"],
  scopeParking: ["Para uma vaga", "To a parking spot", "Para una cochera"],
  scopeUnitShort: ["Apto", "Apt", "Depto"],
  scopeParkingShort: ["Vaga", "Spot", "Cochera"],
  pickUnit: ["Escolha o apartamento", "Pick the apartment", "Elige el departamento"],
  pickSpot: ["Escolha a vaga", "Pick the parking spot", "Elige la cochera"],
  noticeTitlePlaceholder: ["Título (opcional)", "Title (optional)", "Título (opcional)"],
  noticeBodyPlaceholder: ["Escreva o aviso...", "Write the notice...", "Escribe el aviso..."],
  noticeDelivered: ["Aviso enviado ao responsável.", "Notice sent to the person in charge.", "Aviso enviado al responsable."],
  noticePublished: ["Aviso publicado no mural.", "Notice posted on the board.", "Aviso publicado en el muro."],
  noticeNoHolder: [
    "Aviso registrado — a unidade ainda não tem responsável.",
    "Notice saved — this unit has no resident yet.",
    "Aviso guardado — la unidad todavía no tiene responsable.",
  ],
  noticeError: ["Não foi possível publicar o aviso.", "Could not post the notice.", "No se pudo publicar el aviso."],
  noNotices: ["Nenhum aviso ainda.", "No notices yet.", "Todavía no hay avisos."],
  markRead: ["Lido", "Read", "Leído"],
  publish: ["Publicar", "Post", "Publicar"],

  // Anúncios
  newService: ["Anunciar serviço", "Offer a service", "Ofrecer un servicio"],
  newProduct: ["Anunciar produto", "Offer a product", "Ofrecer un producto"],
  listingTitlePlaceholder: ["O que você oferece?", "What are you offering?", "¿Qué ofreces?"],
  listingDescPlaceholder: ["Detalhes (opcional)", "Details (optional)", "Detalles (opcional)"],
  listingPricePlaceholder: ["Preço em R$ (opcional)", "Price in R$ (optional)", "Precio en R$ (opcional)"],
  listingContactPlaceholder: ["Como te chamar (opcional)", "How to reach you (optional)", "Cómo contactarte (opcional)"],
  listingError: ["Não foi possível publicar.", "Could not publish.", "No se pudo publicar."],
  noListings: ["Nada anunciado por aqui ainda.", "Nothing listed here yet.", "Todavía no hay anuncios aquí."],
  archive: ["Arquivar", "Archive", "Archivar"],
  quotaLine: ["{used} de {total} anúncios ativos", "{used} of {total} active listings", "{used} de {total} anuncios activos"],
  quotaPurchased: ["{n} vaga(s) comprada(s)", "{n} purchased slot(s)", "{n} espacio(s) comprado(s)"],
  quotaReached: ["Limite de anúncios ativos atingido.", "Active listing limit reached.", "Límite de anuncios activos alcanzado."],
  slotTitle: ["Vaga extra de anúncio", "Extra listing slot", "Espacio extra de anuncio"],
  slotDesc: [
    "Compre uma vaga para manter mais um anúncio ativo. A vaga é sua para sempre e volta a ficar livre quando você arquiva um anúncio.",
    "Buy a slot to keep one more listing active. The slot is yours forever and frees up when you archive a listing.",
    "Compra un espacio para mantener un anuncio más activo. El espacio es tuyo para siempre y se libera al archivar un anuncio.",
  ],
  slotPolens: ["{n} Poléns", "{n} Polens", "{n} Polens"],
  slotBoughtPolens: ["Vaga liberada.", "Slot unlocked.", "Espacio liberado."],
  slotError: ["Não foi possível iniciar o pagamento.", "Could not start the payment.", "No se pudo iniciar el pago."],

  // Enquetes
  newPoll: ["Nova enquete", "New poll", "Nueva encuesta"],
  pollQuestionPlaceholder: ["O que você quer perguntar?", "What do you want to ask?", "¿Qué quieres preguntar?"],
  pollOptionPlaceholder: ["Opção {n}", "Option {n}", "Opción {n}"],
  pollAddOption: ["Opção", "Option", "Opción"],
  pollCreate: ["Criar", "Create", "Crear"],
  pollNeedsOptions: [
    "Escreva a pergunta e pelo menos duas opções.",
    "Write the question and at least two options.",
    "Escribe la pregunta y al menos dos opciones.",
  ],
  pollError: ["Não foi possível criar a enquete.", "Could not create the poll.", "No se pudo crear la encuesta."],
  noPolls: ["Nenhuma enquete ainda.", "No polls yet.", "Todavía no hay encuestas."],
  pollClosed: ["Encerrada", "Closed", "Cerrada"],
  pollClose: ["Encerrar", "Close", "Cerrar"],
  pollVotes: ["{n} voto(s)", "{n} vote(s)", "{n} voto(s)"],
  pollModalTitle: ["Enquete do condomínio", "Building poll", "Encuesta del condominio"],
  pollOnceHint: ["Cada morador vota uma única vez.", "Each resident votes only once.", "Cada residente vota una sola vez."],
  pollVoteError: ["Não foi possível votar.", "Could not vote.", "No se pudo votar."],
  sending: ["Enviando...", "Sending...", "Enviando..."],

  // Moradores
  residentsPrivacy: [
    "Por privacidade, o apartamento de cada vizinho só aparece para a administração.",
    "For privacy, each neighbour's apartment is only visible to the building admin.",
    "Por privacidad, el departamento de cada vecino solo lo ve la administración.",
  ],
  roleAdmin: ["Administração", "Admin", "Administración"],
  roleVice: ["Vice", "Deputy", "Vice"],
  notConfirmed: ["sem unidade confirmada", "no confirmed unit", "sin unidad confirmada"],

  // Administração
  claimsQueue: ["Reivindicações pendentes", "Pending claims", "Reclamos pendientes"],
  noClaims: ["Nada pendente.", "Nothing pending.", "Nada pendiente."],
  claimWantsUnit: ["quer o apartamento", "claims apartment", "reclama el departamento"],
  claimWantsSpot: ["quer a vaga", "claims parking spot", "reclama la cochera"],
  claimCurrentHolder: ["Hoje é de @{user}", "Currently @{user}'s", "Hoy es de @{user}"],
  claimDecideError: ["Não foi possível decidir.", "Could not decide.", "No se pudo decidir."],
  approve: ["Aprovar", "Approve", "Aprobar"],
  reject: ["Recusar", "Reject", "Rechazar"],
  blocks: ["Blocos", "Blocks", "Bloques"],
  unitsAndSpots: ["Unidades e vagas", "Units and parking spots", "Unidades y cocheras"],
  unitFree: ["livre", "free", "libre"],

  // Vagas do morador
  myParking: ["Minhas vagas", "My parking spots", "Mis cocheras"],
  noParking: ["Nenhuma vaga cadastrada.", "No parking spot registered.", "Ninguna cochera registrada."],
  spotPlaceholder: ["Número da vaga", "Parking spot number", "Número de cochera"],
  addSpot: ["Cadastrar", "Register", "Registrar"],
  spotApproved: ["Vaga vinculada à sua unidade.", "Parking spot linked to your unit.", "Cochera vinculada a tu unidad."],
  spotPending: [
    "Esta vaga já tem responsável. A administração vai decidir.",
    "This parking spot already has an owner. The building admin will decide.",
    "Esta cochera ya tiene responsable. La administración decidirá.",
  ],

  cancel: ["Cancelar", "Cancel", "Cancelar"],
}

// ─── Modalidade: entra no namespace da comunidade ────────────────────────────
const COMMUNITY = {
  kindLabel: ["Tipo", "Type", "Tipo"],
  kindAll: ["Todos", "All", "Todos"],
  kindCommon: ["Comunidade", "Community", "Comunidad"],
  kindCommonHint: [
    "Gente reunida em torno de um enxame.",
    "People gathered around a swarm.",
    "Gente reunida en torno a un enjambre.",
  ],
  kindAcademy: ["Academia", "Gym", "Gimnasio"],
  kindAcademyHint: ["Alunos, treinos e frequência.", "Students, workouts and check-ins.", "Alumnos, entrenamientos y asistencia."],
  kindCondo: ["Condomínio", "Building", "Condominio"],
  kindCondoHint: [
    "Moradores, blocos, apartamentos e vagas.",
    "Residents, blocks, apartments and parking.",
    "Residentes, bloques, departamentos y cocheras.",
  ],
  academyOwnFlowTitle: ["Academia tem cadastro próprio", "Gyms have their own signup", "Los gimnasios tienen su propio registro"],
  academyOwnFlowDesc: [
    "Academias vivem na área de Academias, com alunos, treinos e frequência.",
    "Gyms live in the Gyms area, with students, workouts and check-ins.",
    "Los gimnasios viven en el área de Gimnasios, con alumnos, entrenamientos y asistencia.",
  ],
  academyOwnFlowCta: ["Ir para Academias", "Go to Gyms", "Ir a Gimnasios"],
  condoNameLabel: ["Nome do condomínio", "Building name", "Nombre del condominio"],
  condoNamePlaceholder: ["Ex.: Residencial Jardins", "e.g. Jardins Residence", "Ej.: Residencial Jardines"],
  condoAddressTitle: ["Endereço do condomínio", "Building address", "Dirección del condominio"],
  condoAddressPrivacy: [
    "Bairro e cidade aparecem na busca. Rua, número e CEP só aparecem para moradores confirmados e para a administração.",
    "Neighbourhood and city show up in search. Street, number and postcode are only visible to confirmed residents and the admin.",
    "Barrio y ciudad aparecen en la búsqueda. Calle, número y código postal solo los ven los residentes confirmados y la administración.",
  ],
  condoAddressRequired: [
    "Informe estado, cidade e logradouro do condomínio.",
    "Enter the building's state, city and street.",
    "Indica estado, ciudad y calle del condominio.",
  ],
  residentsCount: ["moradores", "residents", "residentes"],
  searchPlaceholderWithAddress: [
    "Buscar por nome ou endereço...",
    "Search by name or address...",
    "Buscar por nombre o dirección...",
  ],
  stateLabel: ["Estado", "State", "Estado"],
  cityLabel: ["Cidade", "City", "Ciudad"],
  cityPickState: ["Escolha o estado", "Pick the state", "Elige el estado"],
  streetLabel: ["Logradouro", "Street", "Calle"],
  streetPlaceholder: ["Rua, avenida...", "Street, avenue...", "Calle, avenida..."],
  numberLabel: ["Número", "Number", "Número"],
  neighborhoodLabel: ["Bairro", "Neighbourhood", "Barrio"],
  cepLabel: ["CEP", "Postcode", "Código postal"],
  loading: ["Carregando...", "Loading...", "Cargando..."],
}

// ─── Notificações do condomínio ──────────────────────────────────────────────
const NOTIFICATIONS = {
  condoClaimPending: [
    "{who} reivindicou {target}",
    "{who} claimed {target}",
    "{who} reclamó {target}",
  ],
  condoClaimApproved: [
    "Sua reivindicação de {target} foi aprovada",
    "Your claim for {target} was approved",
    "Tu reclamo de {target} fue aprobado",
  ],
  condoClaimRejected: [
    "Sua reivindicação de {target} foi recusada",
    "Your claim for {target} was rejected",
    "Tu reclamo de {target} fue rechazado",
  ],
  condoNoticeReceived: ["Novo aviso para sua unidade", "New notice for your unit", "Nuevo aviso para tu unidad"],
  condoPollOpened: ["Nova enquete no condomínio", "New poll in your building", "Nueva encuesta en el condominio"],
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

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "Condo", CONDO, i)
  added += mergeNamespace(json, "Community", COMMUNITY, i)
  added += mergeNamespace(json, "Notifications", NOTIFICATIONS, i)
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
