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
  postLabel: ["Post", "Post", "Post"],
  beeLabel: ["Bee", "Bee", "Bee"],
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

const GROUPS = { Community: COMMUNITY, Profile: PROFILE, Account: ACCOUNT }

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
