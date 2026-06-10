// Onda 2 do i18n (perfil público): merge de chaves novas em messages/{pt-BR,en,es}.json.
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
// Rodar com: node scripts/i18n-onda2-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// Namespace "Profile" — [pt, en, es]. Placeholders {name}/{time} preservados.
const PROFILE = {
  activateAccount: ["Ative sua conta", "Activate your account", "Activa tu cuenta"],
  addFirstItem: ["Adicionar o primeiro item", "Add the first item", "Agregar el primer elemento"],
  addMedia: ["Adicionar mídia", "Add media", "Agregar medios"],
  agenda: ["Agenda", "Schedule", "Agenda"],
  agendaSubtitle: ["Calendário mensal e lista dos seus agendamentos (mesma experiência da página Agenda).", "Monthly calendar and list of your bookings (same experience as the Schedule page).", "Calendario mensual y lista de tus reservas (la misma experiencia de la página Agenda)."],
  agendaTitle: ["Agenda", "Schedule", "Agenda"],
  availabilityWord: ["Disponibilidade", "Availability", "Disponibilidad"],
  availableTimes: ["Horários disponíveis", "Available times", "Horarios disponibles"],
  avatarUploadError: ["Não foi possível enviar a foto. Tente novamente.", "Couldn't upload the photo. Try again.", "No se pudo subir la foto. Inténtalo de nuevo."],
  back: ["Voltar", "Back", "Volver"],
  backToHome: ["Voltar para o início", "Back to home", "Volver al inicio"],
  backToSearch: ["Voltar para busca", "Back to search", "Volver a la búsqueda"],
  beesVideoNotVertical: ["Esse vídeo não está em 9:16. Bees aceita apenas vídeos verticais (9:16).", "This video isn't 9:16. Bees only accepts vertical videos (9:16).", "Este video no es 9:16. Bees solo acepta videos verticales (9:16)."],
  beesVideoOnly: ["Bees aceita apenas vídeos 9:16. Envie um arquivo MP4 ou WebM.", "Bees only accepts 9:16 videos. Upload an MP4 or WebM file.", "Bees solo acepta videos 9:16. Sube un archivo MP4 o WebM."],
  book: ["Agendar", "Book", "Reservar"],
  bookAria: ["Agendar: {name}", "Book: {name}", "Reservar: {name}"],
  bookError: ["Erro ao agendar", "Error booking", "Error al reservar"],
  bookingDisabled: ["Agendamento online está desativado para este perfil — use mensagens ou outro canal de contato.", "Online booking is disabled for this profile — use messages or another contact channel.", "La reserva en línea está desactivada para este perfil — usa mensajes u otro canal de contacto."],
  bookingInfo: ["Os intervalos vêm das regras semanais da agenda (duração do slot no painel). O pagamento usa o preço do serviço escolhido; o servidor valida sobreposição ao confirmar.", "Time slots come from the schedule's weekly rules (slot duration in the panel). Payment uses the chosen service's price; the server validates overlaps on confirmation.", "Los horarios provienen de las reglas semanales de la agenda (duración del turno en el panel). El pago usa el precio del servicio elegido; el servidor valida solapamientos al confirmar."],
  bookingSuccessBody: ["Seu pagamento foi processado e o profissional foi notificado. Você receberá um email com os detalhes do agendamento.", "Your payment was processed and the professional was notified. You'll receive an email with the booking details.", "Tu pago fue procesado y el profesional fue notificado. Recibirás un correo con los detalles de la reserva."],
  bookingSuccessEmail: ["Os detalhes do agendamento foram enviados para o email informado.", "The booking details were sent to the email provided.", "Los detalles de la reserva se enviaron al correo indicado."],
  bookingWord: ["Agendamento", "Booking", "Reserva"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  change: ["Trocar", "Change", "Cambiar"],
  changeAvatar: ["Trocar foto de perfil", "Change profile photo", "Cambiar foto de perfil"],
  chooseTime: ["Escolha um horário", "Choose a time", "Elige un horario"],
  clanOwner: ["Dono do clan", "Clan owner", "Dueño del clan"],
  clans: ["Clans", "Clans", "Clanes"],
  close: ["Fechar", "Close", "Cerrar"],
  comingSoon: ["Em breve", "Coming soon", "Próximamente"],
  commentOptional: ["Comentário (opcional)", "Comment (optional)", "Comentario (opcional)"],
  confirmHideFromClan: ["Ocultar este post do feed do clan? O post continuará no perfil do membro.", "Hide this post from the clan feed? It will remain on the member's profile.", "¿Ocultar esta publicación del feed del clan? Seguirá en el perfil del miembro."],
  confirmRemoveItem: ["Remover este item do portfólio?", "Remove this portfolio item?", "¿Eliminar este elemento del portafolio?"],
  confirmRemoveMedia: ["Remover esta mídia do portfólio?", "Remove this media from the portfolio?", "¿Eliminar este medio del portafolio?"],
  confirmedUpper: ["CONFIRMADO.", "CONFIRMED.", "CONFIRMADO."],
  continue: ["Continuar", "Continue", "Continuar"],
  createAria: ["Criar", "Create", "Crear"],
  createCourseCta: ["Criar curso na sua conta", "Create a course in your account", "Crear curso en tu cuenta"],
  createItemError: ["Erro ao criar item", "Error creating item", "Error al crear el elemento"],
  createItemErrorRetry: ["Erro ao criar item. Tente novamente.", "Error creating item. Try again.", "Error al crear el elemento. Inténtalo de nuevo."],
  crop: ["Recortar", "Crop", "Recortar"],
  cropDescription: ["Corte sua imagem no formato 4:5 para aparecer melhor no feed.", "Crop your image to 4:5 to look better in the feed.", "Recorta tu imagen a 4:5 para que se vea mejor en el feed."],
  cropTitle: ["Cortar imagem", "Crop image", "Recortar imagen"],
  descriptionLabel: ["Descrição", "Description", "Descripción"],
  descriptionPlaceholder: ["Conte o contexto: cliente, processo, resultado...", "Tell the context: client, process, outcome...", "Cuenta el contexto: cliente, proceso, resultado..."],
  dropImageHint: ["Toque ou arraste sua imagem", "Tap or drag your image", "Toca o arrastra tu imagen"],
  dropVideoHint: ["Toque ou arraste seu vídeo 9:16", "Tap or drag your 9:16 video", "Toca o arrastra tu video 9:16"],
  editClan: ["Editar clan", "Edit clan", "Editar clan"],
  editItem: ["Editar item", "Edit item", "Editar elemento"],
  editItemError: ["Erro ao editar item", "Error editing item", "Error al editar el elemento"],
  editItemErrorRetry: ["Erro ao editar item. Tente novamente.", "Error editing item. Try again.", "Error al editar el elemento. Inténtalo de nuevo."],
  editItemHint: ["Atualize as informações.", "Update the details.", "Actualiza la información."],
  editProfile: ["Editar perfil", "Edit profile", "Editar perfil"],
  editServiceAria: ["Editar serviço: {name}", "Edit service: {name}", "Editar servicio: {name}"],
  emptyOwnerHint: ["Publique seu primeiro trabalho para começar a montar seu portfólio.", "Publish your first work to start building your portfolio.", "Publica tu primer trabajo para empezar a armar tu portafolio."],
  emptyVisitorHint: ["Este perfil ainda não publicou nada por aqui.", "This profile hasn't published anything here yet.", "Este perfil aún no ha publicado nada aquí."],
  engagement: ["Engajamento", "Engagement", "Interacción"],
  followersShort: ["Acomp.", "Following", "Siguen"],
  hideFromClan: ["Ocultar do clan", "Hide from clan", "Ocultar del clan"],
  hideFromClanError: ["Erro ao ocultar do clan", "Error hiding from clan", "Error al ocultar del clan"],
  hideFromClanErrorRetry: ["Erro ao ocultar do clan. Tente novamente.", "Error hiding from clan. Try again.", "Error al ocultar del clan. Inténtalo de nuevo."],
  hideFromClanTitle: ["Ocultar do clan (não exclui do perfil do membro)", "Hide from clan (doesn't delete from the member's profile)", "Ocultar del clan (no elimina del perfil del miembro)"],
  imageFormats: ["JPG, PNG ou WebP — recortamos pra 4:5", "JPG, PNG or WebP — we crop to 4:5", "JPG, PNG o WebP — recortamos a 4:5"],
  imageLabel: ["Imagem", "Image", "Imagen"],
  imageLimits: ["4:5 · até 3MB", "4:5 · up to 3MB", "4:5 · hasta 3MB"],
  like: ["Curtir", "Like", "Me gusta"],
  loadingCourses: ["Carregando cursos…", "Loading courses…", "Cargando cursos…"],
  loadingProfile: ["Carregando perfil…", "Loading profile…", "Cargando perfil…"],
  loadingServices: ["Carregando serviços…", "Loading services…", "Cargando servicios…"],
  loadingShop: ["Carregando loja…", "Loading store…", "Cargando tienda…"],
  loginToBook: ["Faça login para agendar", "Log in to book", "Inicia sesión para reservar"],
  manage: ["Gerenciar", "Manage", "Gestionar"],
  mediaAlt: ["Mídia", "Media", "Medio"],
  mediaUploadError: ["Erro ao fazer upload da mídia", "Error uploading media", "Error al subir el medio"],
  memberPlural: ["membros", "members", "miembros"],
  memberSingular: ["membro", "member", "miembro"],
  members: ["Membros", "Members", "Miembros"],
  membersOf: ["Membros de {name}", "Members of {name}", "Miembros de {name}"],
  menuCourse: ["Curso", "Course", "Curso"],
  menuService: ["Serviço", "Service", "Servicio"],
  minShort: ["min", "min", "min"],
  mural: ["Mural", "Wall", "Muro"],
  myMessages: ["Minhas mensagens", "My messages", "Mis mensajes"],
  newBees: ["Novo Bees", "New Bees", "Nuevo Bees"],
  newBeesHint: ["Envie um vídeo vertical 9:16.", "Upload a vertical 9:16 video.", "Sube un video vertical 9:16."],
  newPost: ["Novo post", "New post", "Nueva publicación"],
  newPostHint: ["Mostre seu trabalho com uma imagem 4:5.", "Show your work with a 4:5 image.", "Muestra tu trabajo con una imagen 4:5."],
  nextDates: ["Próximas datas", "Next dates", "Fechas siguientes"],
  noBeesYet: ["Nenhum Bees ainda.", "No Bees yet.", "Ningún Bees todavía."],
  noCoursesLinked: ["Nenhum curso vinculado", "No linked courses", "Ningún curso vinculado"],
  noCoursesOwnerHint: ["Vincule um curso a este perfil para mostrá-lo aqui.", "Link a course to this profile to show it here.", "Vincula un curso a este perfil para mostrarlo aquí."],
  noCoursesVisitorHint: ["Este perfil ainda não publicou cursos.", "This profile hasn't published any courses yet.", "Este perfil aún no ha publicado cursos."],
  noMembersFound: ["Nenhum membro encontrado.", "No members found.", "No se encontraron miembros."],
  noName: ["Sem nome", "No name", "Sin nombre"],
  noPortfolioYet: ["Nenhum item no portfólio ainda.", "No portfolio items yet.", "Ningún elemento en el portafolio todavía."],
  noServices: ["Nenhum serviço", "No services", "Ningún servicio"],
  noServicesDesc: ["Nenhum serviço público disponível no momento.", "No public services available right now.", "Ningún servicio público disponible por ahora."],
  noSlotsAfter: ["na agenda do perfil ou escolha outra data.", "in the profile's schedule, or choose another date.", "en la agenda del perfil o elige otra fecha."],
  noSlotsBefore: ["Nenhum horário disponível nesta data (sem regra para esse dia da semana, dia bloqueado ou já ocupado). Configure em", "No times available on this date (no rule for this weekday, day blocked, or already booked). Set it up in", "Ningún horario disponible en esta fecha (sin regla para ese día de la semana, día bloqueado o ya ocupado). Configúralo en"],
  openMural: ["Abrir Mural", "Open Wall", "Abrir Muro"],
  optimizeError: ["Não foi possível otimizar esse arquivo. Tente outro.", "Couldn't optimize this file. Try another.", "No se pudo optimizar este archivo. Prueba otro."],
  optimizing: ["Otimizando...", "Optimizing...", "Optimizando..."],
  outOfStock: ["Esgotado", "Out of stock", "Agotado"],
  portfolioMediaAlt: ["Mídia do portfólio", "Portfolio media", "Medio del portafolio"],
  postImageTooBig: ["A imagem do post precisa ter no máximo 3MB.", "The post image must be at most 3MB.", "La imagen de la publicación debe pesar máximo 3MB."],
  postsLabel: ["Posts", "Posts", "Publicaciones"],
  prevDates: ["Datas anteriores", "Previous dates", "Fechas anteriores"],
  previewAlt: ["Pré-visualização", "Preview", "Vista previa"],
  profileLoadError: ["Não foi possível carregar este perfil.", "Couldn't load this profile.", "No se pudo cargar este perfil."],
  profileNotFound: ["Perfil não encontrado", "Profile not found", "Perfil no encontrado"],
  profilePlural: ["perfis", "profiles", "perfiles"],
  profileSingular: ["perfil", "profile", "perfil"],
  publish: ["Publicar", "Publish", "Publicar"],
  publishing: ["Publicando…", "Publishing…", "Publicando…"],
  ranking: ["Ranking", "Ranking", "Ranking"],
  rateError: ["Erro ao avaliar", "Error submitting review", "Error al calificar"],
  rateSelectStars: ["Selecione de 1 a 5 estrelas.", "Select 1 to 5 stars.", "Selecciona de 1 a 5 estrellas."],
  rateSent: ["Avaliação enviada. Obrigado!", "Review submitted. Thank you!", "¡Reseña enviada. Gracias!"],
  rateSubtitle: ["Você tem um agendamento pago e pode deixar uma avaliação.", "You have a paid booking and can leave a review.", "Tienes una reserva pagada y puedes dejar una reseña."],
  rateTitle: ["Avalie este profissional", "Rate this professional", "Califica a este profesional"],
  reference: ["Referência", "Reference", "Referencia"],
  remove: ["Remover", "Remove", "Quitar"],
  removeItem: ["Remover item", "Remove item", "Quitar elemento"],
  removeItemError: ["Erro ao remover item", "Error removing item", "Error al quitar el elemento"],
  removeItemErrorRetry: ["Erro ao remover item. Tente novamente.", "Error removing item. Try again.", "Error al quitar el elemento. Inténtalo de nuevo."],
  removeMediaAria: ["Remover mídia", "Remove media", "Quitar medio"],
  removeMediaError: ["Erro ao remover mídia", "Error removing media", "Error al quitar el medio"],
  removeMediaErrorRetry: ["Erro ao remover mídia. Tente novamente.", "Error removing media. Try again.", "Error al quitar el medio. Inténtalo de nuevo."],
  save: ["Salvar", "Save", "Guardar"],
  searchMembersPlaceholder: ["Buscar por nome ou @username", "Search by name or @username", "Buscar por nombre o @usuario"],
  seeFollowersAria: ["Ver quem acompanha", "See who follows", "Ver quién sigue"],
  selectedService: ["Serviço selecionado", "Selected service", "Servicio seleccionado"],
  sendMessage: ["Enviar mensagem", "Send message", "Enviar mensaje"],
  sendRating: ["Enviar avaliação", "Submit review", "Enviar reseña"],
  sending: ["Enviando…", "Sending…", "Enviando…"],
  servicesOwnerSubtitle: ["Serviços públicos oferecidos por este subperfil.", "Public services offered by this subprofile.", "Servicios públicos ofrecidos por este subperfil."],
  servicesUnavailable: ["Serviços indisponíveis", "Services unavailable", "Servicios no disponibles"],
  servicesUnavailableDesc: ["Não foi possível carregar os serviços agora. Tente novamente mais tarde.", "Couldn't load services right now. Try again later.", "No se pudieron cargar los servicios ahora. Inténtalo más tarde."],
  settings: ["Configurações", "Settings", "Configuración"],
  shopEmpty: ["Loja vazia", "Empty store", "Tienda vacía"],
  shopEmptyDesc: ["Nenhum produto disponível na loja no momento.", "No products available in the store right now.", "Ningún producto disponible en la tienda por ahora."],
  shopUnavailable: ["Loja indisponível", "Store unavailable", "Tienda no disponible"],
  shopUnavailableDesc: ["Não foi possível carregar a loja agora.", "Couldn't load the store right now.", "No se pudo cargar la tienda ahora."],
  slotAvailable: ["Disponível", "Available", "Disponible"],
  slotFew: ["Poucas vagas", "Few spots", "Pocos cupos"],
  slotUnavailable: ["Indisponível", "Unavailable", "No disponible"],
  socialNetwork: ["Rede social", "Social network", "Red social"],
  starSingular: ["estrela", "star", "estrella"],
  starsPlural: ["estrelas", "stars", "estrellas"],
  statusActive: ["ativo", "active", "activo"],
  statusDraft: ["Rascunho", "Draft", "Borrador"],
  statusDraftBadge: ["rascunho", "draft", "borrador"],
  statusPaused: ["Pausado", "Paused", "Pausado"],
  statusUnpublished: ["não publicado", "unpublished", "no publicado"],
  tabCourses: ["Cursos", "Courses", "Cursos"],
  tabPortfolio: ["Portfólio", "Portfolio", "Portafolio"],
  tabServices: ["Serviços", "Services", "Servicios"],
  tabShop: ["Loja", "Store", "Tienda"],
  titleLabel: ["Título", "Title", "Título"],
  titlePlaceholder: ["Campanha de verão, ensaio fotográfico...", "Summer campaign, photo shoot...", "Campaña de verano, sesión de fotos..."],
  unlike: ["Remover like", "Unlike", "Quitar me gusta"],
  untilTime: ["Até {time}", "Until {time}", "Hasta {time}"],
  untitled: ["Sem título", "Untitled", "Sin título"],
  uploadError: ["Erro ao fazer upload", "Upload error", "Error al subir"],
  uploadErrorRetry: ["Erro ao fazer upload. Tente novamente.", "Upload error. Try again.", "Error al subir. Inténtalo de nuevo."],
  videoFormats: ["MP4 ou WebM, vertical", "MP4 or WebM, vertical", "MP4 o WebM, vertical"],
  videoLabel: ["Vídeo", "Video", "Video"],
  videoLimits: ["9:16 · até 100MB", "9:16 · up to 100MB", "9:16 · hasta 100MB"],
  videoValidateError: ["Não foi possível validar o vídeo.", "Couldn't validate the video.", "No se pudo validar el video."],
  view: ["Ver", "View", "Ver"],
  viewMembers: ["Ver membros", "View members", "Ver miembros"],
}

// Namespace "Product" — só as chaves NOVAS desta onda (as demais já existem).
const PRODUCT = {
  localPickupTitle: ["Retirada combinada com o vendedor", "Pickup arranged with the seller", "Retiro acordado con el vendedor"],
  localPickupDesc: ["Este produto não usa frete por transportadora. Combine a entrega ou retirada diretamente com o vendedor antes de pagar.", "This product doesn't use carrier shipping. Arrange delivery or pickup directly with the seller before paying.", "Este producto no usa envío por transportista. Acuerda la entrega o el retiro directamente con el vendedor antes de pagar."],
  exceededLimitsTitle: ["Excedeu o limite das transportadoras", "Exceeds carrier limits", "Supera el límite de los transportistas"],
  exceededWeight: ["Este produto pesa mais que o aceito por SEDEX/PAC/Jadlog (carga pesada). ", "This product weighs more than SEDEX/PAC/Jadlog accept (heavy load). ", "Este producto pesa más de lo aceptado por SEDEX/PAC/Jadlog (carga pesada). "],
  exceededSize: ["As dimensões deste produto passam do limite aceito por SEDEX/PAC/Jadlog. ", "This product's dimensions exceed the limit accepted by SEDEX/PAC/Jadlog. ", "Las dimensiones de este producto superan el límite aceptado por SEDEX/PAC/Jadlog. "],
  exceededLimitsCta: ["Combine retirada ou frete dedicado direto com o vendedor.", "Arrange pickup or dedicated shipping directly with the seller.", "Acuerda el retiro o un envío dedicado directamente con el vendedor."],
  talkToSeller: ["Falar com vendedor", "Contact seller", "Hablar con el vendedor"],
}

// Aliases do TaxEnxame: enxameFull(null, machine_name) no headcard deriva o slug
// do nome pt e gera hífen onde o slug real usa underscore. Cobrir os 2 casos.
const TAX_ENXAME_ALIAS = {
  "servicos-residenciais": ["Home Services", "Servicios Residenciales"],
  "beleza-e-bem-estar": ["Beauty & Wellness", "Belleza y Bienestar"],
}

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
  for (const [k, vals] of Object.entries(PROFILE)) added += fill(d, "Profile", k, vals[idx])
  for (const [k, vals] of Object.entries(PRODUCT)) added += fill(d, "Product", k, vals[idx])
  // TaxEnxame só em en/es (pt cai no fallback = nome da API).
  if (idx > 0) {
    for (const [k, vals] of Object.entries(TAX_ENXAME_ALIAS)) added += fill(d, "TaxEnxame", k, vals[idx - 1])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
