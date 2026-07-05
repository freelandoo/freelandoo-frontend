// Namespace "Community" — redesign Clan → Comunidade (lista, página com 3 abas,
// criação, ingresso R$100 e modal de votação de liderança). Idempotente e
// não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve. Placeholders
// {x} preservados (o provider não interpola — resolver com .replace no render).
// Rodar: node scripts/i18n-comunidade-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const COMMUNITY = {
  // Lista
  browseByEnxame: ["Buscar por enxame", "Browse by swarm", "Buscar por enjambre"],
  pageTitle: ["Comunidades", "Communities", "Comunidades"],
  pageSubtitle: [
    "Encontre e participe de comunidades.",
    "Find and join communities.",
    "Encuentra y únete a comunidades.",
  ],
  searchPlaceholder: ["Buscar comunidade...", "Search community...", "Buscar comunidad..."],
  create: ["Criar comunidade", "Create community", "Crear comunidad"],
  membersCount: ["membros", "members", "miembros"],
  level: ["Nível", "Level", "Nivel"],
  empty: ["Nenhuma comunidade ainda.", "No communities yet.", "Aún no hay comunidades."],
  loadError: ["Erro ao carregar comunidades", "Error loading communities", "Error al cargar comunidades"],
  allEnxames: ["Todos os enxames", "All swarms", "Todos los enjambres"],
  // Página
  back: ["Voltar", "Back", "Volver"],
  tabFeed: ["Feed", "Feed", "Feed"],
  tabBees: ["Bees", "Bees", "Bees"],
  tabMembers: ["Membros", "Members", "Miembros"],
  join: ["Entrar", "Join", "Unirse"],
  leave: ["Sair", "Leave", "Salir"],
  leaving: ["Saindo...", "Leaving...", "Saliendo..."],
  joining: ["Entrando...", "Joining...", "Uniéndose..."],
  roleLeader: ["Líder", "Leader", "Líder"],
  roleVice: ["Vice-líder", "Vice-leader", "Vicelíder"],
  roleMember: ["Membro", "Member", "Miembro"],
  joinSuccess: ["Você entrou na comunidade!", "You joined the community!", "¡Te uniste a la comunidad!"],
  leaveSuccess: ["Você saiu da comunidade.", "You left the community.", "Saliste de la comunidad."],
  joinError: ["Não foi possível entrar.", "Could not join.", "No se pudo unir."],
  rankingPosition: ["Posição no ranking", "Ranking position", "Posición en el ranking"],
  feedEmpty: [
    "Esta comunidade ainda não publicou nada.",
    "This community hasn't posted anything yet.",
    "Esta comunidad aún no ha publicado nada.",
  ],
  beesEmpty: ["Nenhum Bee ainda.", "No Bees yet.", "Aún no hay Bees."],
  membersEmpty: ["Sem membros ainda.", "No members yet.", "Aún no hay miembros."],
  notFound: ["Comunidade não encontrada.", "Community not found.", "Comunidad no encontrada."],
  loginToJoin: ["Entre para participar", "Sign in to join", "Inicia sesión para unirte"],
  // Edição inline de perfil (líder)
  editName: ["Editar nome", "Edit name", "Editar nombre"],
  editBio: ["Editar descrição", "Edit description", "Editar descripción"],
  addBio: ["Adicionar descrição", "Add a description", "Agregar descripción"],
  bioPlaceholder: ["Conte sobre a comunidade...", "Tell people about the community...", "Cuenta sobre la comunidad..."],
  save: ["Salvar", "Save", "Guardar"],
  saving: ["Salvando...", "Saving...", "Guardando..."],
  saveError: ["Não foi possível salvar.", "Could not save.", "No se pudo guardar."],
  profileSaved: ["Alterações salvas!", "Changes saved!", "¡Cambios guardados!"],
  changeBanner: ["Trocar capa", "Change cover", "Cambiar portada"],
  changePhoto: ["Trocar foto", "Change photo", "Cambiar foto"],
  uploading: ["Enviando...", "Uploading...", "Subiendo..."],
  uploadError: ["Não foi possível enviar a imagem.", "Could not upload the image.", "No se pudo subir la imagen."],
  // Identidade Casa Views (líder): toggle de edição + seletor de cor de destaque
  edit: ["Editar", "Edit", "Editar"],
  viewPublic: ["Ver como público", "View as public", "Ver como público"],
  colorsLabel: ["Cores", "Colors", "Colores"],
  profileSection: ["Perfil", "Profile", "Perfil"],
  accentMagenta: ["Magenta", "Magenta", "Magenta"],
  accentCyan: ["Ciano", "Cyan", "Cian"],
  accentGold: ["Dourado", "Gold", "Dorado"],
  accentPurple: ["Roxo", "Purple", "Morado"],
  accentLeaf: ["Verde folha", "Leaf green", "Verde hoja"],
  accentRed: ["Vermelho", "Red", "Rojo"],
  accentOrange: ["Laranja", "Orange", "Naranja"],
  accentGray: ["Cinza", "Gray", "Gris"],
  // Meta coletiva
  goalTitle: ["Meta da comunidade", "Community goal", "Meta de la comunidad"],
  goalSet: ["Definir meta", "Set goal", "Definir meta"],
  goalEdit: ["Editar meta", "Edit goal", "Editar meta"],
  goalRemove: ["Remover", "Remove", "Quitar"],
  goalTarget: ["Alvo", "Target", "Meta"],
  goalNamePlaceholder: ["Ex.: Bora postar essa semana!", "e.g. Let's post this week!", "Ej.: ¡A publicar esta semana!"],
  goalInvalid: ["Preencha o nome e um alvo maior que zero.", "Fill in a name and a target above zero.", "Completa un nombre y una meta mayor que cero."],
  metricXp: ["XP coletivo", "Community XP", "XP colectivo"],
  metricPosts: ["Publicações", "Posts", "Publicaciones"],
  metricMembers: ["Membros", "Members", "Miembros"],
  metricShares: ["Compartilhamentos", "Shares", "Compartidos"],
  // Temporada (meta com prazo + prêmio + vencedor)
  goalStart: ["Iniciar temporada", "Start season", "Iniciar temporada"],
  goalDays30: ["30 dias", "30 days", "30 días"],
  goalDays60: ["60 dias", "60 days", "60 días"],
  goalDays90: ["90 dias", "90 days", "90 días"],
  goalPrizeNote: ["100 poléns pro 1º lugar", "100 pollens for 1st place", "100 pólenes para el 1º"],
  goalMinMembers: ["mín. 5 membros", "min. 5 members", "mín. 5 miembros"],
  goalDaysLeft: ["faltam", "left:", "faltan"],
  goalDaysWord: ["dias", "days", "días"],
  goalEnded: ["Temporada encerrada", "Season ended", "Temporada finalizada"],
  goalWonPrize: ["levou", "won", "ganó"],
  goalNoWinner: ["Sem vencedor (ninguém pontuou).", "No winner (nobody scored).", "Sin ganador (nadie puntuó)."],
  goalNewSeason: ["Nova temporada", "New season", "Nueva temporada"],
  polensWord: ["poléns", "pollens", "pólenes"],
  rankingSeasonTitle: ["Ranking da temporada", "Season ranking", "Ranking de la temporada"],
  spotlightWinner: ["Vencedor", "Winner", "Ganador"],
  spotlightLeader: ["Líder da temporada", "Season leader", "Líder de la temporada"],
  postsEng: ["posts/eng", "posts/eng", "posts/eng"],
  postsEngHint: ["posts / engajamento", "posts / engagement", "posts / interacción"],
  // Mural do líder
  muralTitle: ["Mural do líder", "Leader's board", "Muro del líder"],
  muralEmpty: ["Nenhum recado ainda.", "No posts yet.", "Sin avisos aún."],
  muralPlaceholder: ["Escreva um recado para a comunidade...", "Write a note to the community...", "Escribe un aviso para la comunidad..."],
  muralPost: ["Publicar", "Post", "Publicar"],
  muralPin: ["Fixar", "Pin", "Fijar"],
  pinned: ["Fixado", "Pinned", "Fijado"],
  // Benchmark
  benchmarkTitle: ["Benchmark", "Benchmark", "Benchmark"],
  benchmarkOf: ["de", "of", "de"],
  benchmarkTop: ["top", "top", "top"],
  communitiesWord: ["comunidades", "communities", "comunidades"],
  // Ranking interno + destaque
  spotlightTitle: ["Destaque", "Spotlight", "Destacado"],
  spotlightSub: ["Membro destaque", "Top member", "Miembro destacado"],
  rankingTitle: ["Ranking dos membros", "Member ranking", "Ranking de miembros"],
  // Feed estilo grupo
  writeSomething: ["Escreva algo...", "Write something...", "Escribe algo..."],
  composerCta: ["Poste ou escreva aqui", "Post or write here", "Publica o escribe aquí"],
  postLabel: ["Post", "Post", "Post"],
  beeLabel: ["Bee", "Bee", "Bee"],
  // Recado (nota só-texto, exclusiva do feed da comunidade — até 2000 chars)
  recadoLabel: ["Recado", "Note", "Recado"],
  recadoTitle: ["Novo recado", "New note", "Nuevo recado"],
  recadoPlaceholder: [
    "Escreva um recado para a comunidade...",
    "Write a note to the community...",
    "Escribe un recado para la comunidad...",
  ],
  recadoPublish: ["Publicar recado", "Post note", "Publicar recado"],
  recadoOnlyHere: ["Fica só na comunidade", "Stays in the community only", "Queda solo en la comunidad"],
  recadoError: ["Não foi possível publicar o recado.", "Could not post the note.", "No se pudo publicar el recado."],
  feedEmptyGroup: ["Ainda não há publicações. Seja o primeiro!", "No posts yet. Be the first!", "Aún no hay publicaciones. ¡Sé el primero!"],
  joinToPost: ["Entre na comunidade para publicar.", "Join the community to post.", "Únete a la comunidad para publicar."],
  loadMore: ["Ver mais", "Load more", "Ver más"],
  // Tema (líder)
  editTheme: ["Editar cores", "Edit colors", "Editar colores"],
  saveTheme: ["Salvar", "Save", "Guardar"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  themeSaved: ["Cores atualizadas!", "Colors updated!", "¡Colores actualizados!"],
  themeError: ["Não foi possível salvar as cores.", "Could not save colors.", "No se pudieron guardar los colores."],
  colorPrimary: ["Cor principal", "Primary color", "Color principal"],
  colorBackground: ["Cor de fundo", "Background color", "Color de fondo"],
  colorText: ["Cor do texto", "Text color", "Color del texto"],
  // Criação
  createTitle: ["Criar comunidade", "Create community", "Crear comunidad"],
  createSubtitle: [
    "Reúna pessoas em torno de um enxame.",
    "Bring people together around a swarm.",
    "Reúne personas en torno a un enjambre.",
  ],
  nameLabel: ["Nome da comunidade", "Community name", "Nombre de la comunidad"],
  namePlaceholder: ["Ex.: Confeiteiros de SP", "e.g. SP Bakers", "Ej.: Reposteros de SP"],
  enxameLabel: ["Enxame", "Swarm", "Enjambre"],
  bioLabel: ["Descrição (opcional)", "Description (optional)", "Descripción (opcional)"],
  createButton: ["Criar", "Create", "Crear"],
  creating: ["Criando...", "Creating...", "Creando..."],
  needLevel5: [
    "Você precisa de pelo menos um subperfil nível 5 para criar uma comunidade.",
    "You need at least one level 5 subprofile to create a community.",
    "Necesitas al menos un subperfil de nivel 5 para crear una comunidad.",
  ],
  createError: ["Não foi possível criar a comunidade.", "Could not create the community.", "No se pudo crear la comunidad."],
  createSuccess: ["Comunidade criada!", "Community created!", "¡Comunidad creada!"],
  // Ingresso (bundle R$100)
  slotTitle: ["Ingresso de Comunidade", "Community Pass", "Pase de Comunidad"],
  slotDesc: [
    "Por R$100 você libera +1 comunidade para criar e +1 para participar (máximo de 3).",
    "For R$100 you unlock +1 community to create and +1 to join (max of 3).",
    "Por R$100 desbloqueas +1 comunidad para crear y +1 para unirte (máximo de 3).",
  ],
  slotBuy: ["Comprar ingresso (R$100)", "Buy pass (R$100)", "Comprar pase (R$100)"],
  slotRedirect: ["Redirecionando para o pagamento...", "Redirecting to payment...", "Redirigiendo al pago..."],
  slotMax: [
    "Você já atingiu o limite de 3 comunidades.",
    "You've reached the limit of 3 communities.",
    "Ya alcanzaste el límite de 3 comunidades.",
  ],
  slotError: ["Não foi possível iniciar o pagamento.", "Could not start the payment.", "No se pudo iniciar el pago."],
  capCreate: ["Pode criar", "Can create", "Puede crear"],
  capMember: ["Pode participar", "Can join", "Puede unirse"],
  // Votação
  voteTitle: ["Votação de liderança", "Leadership vote", "Votación de liderazgo"],
  votePrompt: [
    "Sua comunidade está evoluindo pouco. Quem você quer como líder?",
    "Your community is growing slowly. Who do you want as leader?",
    "Tu comunidad está creciendo poco. ¿A quién quieres como líder?",
  ],
  voteKeep: ["Manter {name}", "Keep {name}", "Mantener a {name}"],
  voteSwitch: ["Trocar para {name}", "Switch to {name}", "Cambiar a {name}"],
  voteLevelN: ["Nível {n}", "Level {n}", "Nivel {n}"],
  voteDone: ["Voto registrado!", "Vote recorded!", "¡Voto registrado!"],
  voteError: ["Não foi possível votar.", "Could not vote.", "No se pudo votar."],
}

// Chave avulsa no ns Profile: ação "Comunidade" no headcard (era "Clans").
const PROFILE = {
  communities: ["Comunidade", "Community", "Comunidad"],
}

// ns Post: card do /feed — botão "Acessar comunidade" + variante recado.
const POST = {
  accessCommunity: ["Acessar comunidade", "Open community", "Abrir comunidad"],
  recadoLabel: ["Recado", "Note", "Recado"],
  deleteRecado: ["Apagar", "Delete", "Eliminar"],
}

// ns Account: aba/contador/menu/slot do /account (substituem os de Clans).
const ACCOUNT = {
  tabCommunity: ["Comunidade", "Community", "Comunidad"],
  countCommunities: ["Comunidades", "Communities", "Comunidades"],
  menuCommunity: ["Comunidade", "Community", "Comunidad"],
  myCommunities: ["Minhas comunidades", "My communities", "Mis comunidades"],
  noCommunitiesYet: [
    "Você ainda não participa de nenhuma comunidade.",
    "You're not in any community yet.",
    "Aún no participas en ninguna comunidad.",
  ],
  createOrJoinCommunity: [
    "Criar ou entrar em uma comunidade",
    "Create or join a community",
    "Crear o unirse a una comunidad",
  ],
  openCommunityAria: ["Abrir comunidade {name}", "Open community {name}", "Abrir comunidad {name}"],
  roleLeaderShort: ["Líder", "Leader", "Líder"],
  roleViceShort: ["Vice-líder", "Vice-leader", "Vicelíder"],
  roleMemberShort: ["Membro", "Member", "Miembro"],
}

// ns Search: 4ª aba "Comunidades" no enxame + estados vazios da malha.
const SEARCH = {
  tabCommunities: ["Comunidades", "Communities", "Comunidades"],
  noCommunitiesTitle: ["Nenhuma comunidade encontrada", "No communities found", "Ninguna comunidad encontrada"],
  noCommunitiesHint: [
    "Escolha outro enxame ou crie a sua comunidade.",
    "Pick another swarm or create your own community.",
    "Elige otro enjambre o crea tu comunidad.",
  ],
}

// ns Ranking: filtro "Comunidades" (top 3 por enxame + região) + selo.
const RANKING = {
  scopeComunidades: ["Comunidades", "Communities", "Comunidades"],
  badgeCommunity: ["Comunidade", "Community", "Comunidad"],
  allEnxames: ["Todos", "All", "Todos"],
  allCommunities: ["Todas as comunidades", "All communities", "Todas las comunidades"],
  allRegions: ["Todas as regiões", "All regions", "Todas las regiones"],
  membersWord: ["membros", "members", "miembros"],
}

// ns Onboarding: modal de idade (BirthdateGate) + redes sociais opcionais.
const ONBOARDING = {
  title: ["Falta completar seu cadastro", "Complete your sign-up", "Falta completar tu registro"],
  description: [
    "Informe sua data de nascimento para usar a Freelandoo. Se você for menor de 18 anos, vai precisar de um código parental de um responsável adulto.",
    "Enter your date of birth to use Freelandoo. If you're under 18, you'll need a parental code from an adult guardian.",
    "Indica tu fecha de nacimiento para usar Freelandoo. Si eres menor de 18 años, necesitarás un código parental de un responsable adulto.",
  ],
  birthdateLabel: ["Data de nascimento", "Date of birth", "Fecha de nacimiento"],
  ageInfo: ["Você tem {age} {unit}.", "You are {age} {unit}.", "Tienes {age} {unit}."],
  yearUnit: ["ano", "year", "año"],
  yearsUnit: ["anos", "years", "años"],
  minorNotice: [
    "Conta supervisionada: peça ao seu responsável para gerar um código em Conta › Parental e cole abaixo.",
    "Supervised account: ask your guardian to generate a code in Account › Parental and paste it below.",
    "Cuenta supervisada: pide a tu responsable que genere un código en Cuenta › Parental y pégalo abajo.",
  ],
  codeLabel: ["Código do responsável", "Guardian code", "Código del responsable"],
  codePlaceholder: ["PAR-XXXXXXXX", "PAR-XXXXXXXX", "PAR-XXXXXXXX"],
  codeChecking: ["Verificando...", "Checking...", "Verificando..."],
  codeValid: ["Código válido — responsável encontrado.", "Valid code — guardian found.", "Código válido — responsable encontrado."],
  codeInvalid: ["Código inválido", "Invalid code", "Código inválido"],
  codeFail: ["Falha ao validar — tente novamente.", "Validation failed — try again.", "Error al validar — inténtalo de nuevo."],
  saveFail: ["Falha ao salvar", "Failed to save", "Error al guardar"],
  connError: ["Erro de conexão. Tente novamente.", "Connection error. Try again.", "Error de conexión. Inténtalo de nuevo."],
  saving: ["Salvando...", "Saving...", "Guardando..."],
  continue: ["Continuar", "Continue", "Continuar"],
  socialTitle: ["Coloque suas redes sociais", "Add your social networks", "Agrega tus redes sociales"],
  optional: ["(opcional)", "(optional)", "(opcional)"],
  socialSubtitle: ["Para mais gente te encontrar.", "So more people can find you.", "Para que más gente te encuentre."],
}

// Comunidade privada com mensalidade (mig 173 / slice C2)
Object.assign(COMMUNITY, {
  privateBadge: ["Privada", "Private", "Privada"],
  perMonthShort: ["mês", "mo", "mes"],
  subscribeJoin: ["Assinar", "Subscribe", "Suscribirse"],
  subscribeError: [
    "Não foi possível iniciar a assinatura.",
    "Could not start the subscription.",
    "No se pudo iniciar la suscripción.",
  ],
  subscribeSuccess: [
    "Assinatura confirmada! Bem-vindo(a) à comunidade.",
    "Subscription confirmed! Welcome to the community.",
    "¡Suscripción confirmada! Bienvenido(a) a la comunidad.",
  ],
  subscribeCanceled: [
    "Assinatura cancelada — você não foi cobrado.",
    "Subscription canceled — you were not charged.",
    "Suscripción cancelada — no se te cobró.",
  ],
  privacyTitle: ["Privacidade", "Privacy", "Privacidad"],
  privacyPublic: ["Pública", "Public", "Pública"],
  privacyPrivate: ["Privada", "Private", "Privada"],
  privacyPriceLabel: ["Mensalidade R$", "Monthly fee R$", "Mensualidad R$"],
  privacyApply: ["Aplicar", "Apply", "Aplicar"],
  privacyPriceInvalid: [
    "Informe o valor da mensalidade.",
    "Enter the monthly fee.",
    "Ingresa el valor de la mensualidad.",
  ],
  privacySavedPrivate: [
    "Comunidade agora é privada.",
    "The community is now private.",
    "La comunidad ahora es privada.",
  ],
  privacySavedPublic: [
    "Comunidade agora é pública.",
    "The community is now public.",
    "La comunidad ahora es pública.",
  ],
  privacyPrivateHint: [
    "Privada: os posts ficam só aqui dentro (não vão pro feed nem pros bees) e entrar exige assinatura mensal. Membros atuais continuam sem pagar.",
    "Private: posts stay inside only (they don't go to the feed or bees) and joining requires a monthly subscription. Current members keep free access.",
    "Privada: las publicaciones se quedan solo aquí dentro (no van al feed ni a los bees) y entrar requiere una suscripción mensual. Los miembros actuales siguen sin pagar.",
  ],
  privacyPublicHint: [
    "Pública: qualquer pessoa entra de graça e os posts também aparecem no feed. Assinaturas existentes param de cobrar no fim do ciclo.",
    "Public: anyone joins for free and posts also appear in the feed. Existing subscriptions stop charging at the end of the cycle.",
    "Pública: cualquiera entra gratis y las publicaciones también aparecen en el feed. Las suscripciones existentes dejan de cobrar al final del ciclo.",
  ],
  summarySubs: ["Assinantes", "Subscribers", "Suscriptores"],
  summaryWaiting: ["Em liberação", "On hold", "En liberación"],
  summaryAvailable: ["Liberado", "Available", "Liberado"],
  summaryTotal: ["Total líquido", "Net total", "Total neto"],
  lockedTitle: ["Comunidade privada", "Private community", "Comunidad privada"],
  lockedText: [
    "O feed é exclusivo para membros. Assine para entrar e ver tudo que acontece aqui dentro.",
    "The feed is members-only. Subscribe to join and see everything happening inside.",
    "El feed es exclusivo para miembros. Suscríbete para entrar y ver todo lo que pasa aquí dentro.",
  ],
})

const GROUPS = { Community: COMMUNITY, Profile: PROFILE, Account: ACCOUNT, Post: POST, Search: SEARCH, Ranking: RANKING, Onboarding: ONBOARDING }

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
