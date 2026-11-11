// Meu Mundo: textos que o SERVIDOR manda, traduzidos no aparelho.
// A chave é o próprio texto em português: código não serve, porque ~60
// mensagens não têm código e `dead`, `item`, `far`, `level` repetem com textos
// diferentes. features/meu-mundo/server-errors.ts lê este namespace.
// Conferência com o back: node scripts/check-mm-server-errors.js
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ROWS = [
  // Lutas
  ["Inimigo desconhecido", "Unknown enemy", "Enemigo desconocido"],
  ["Origem da luta inválida", "Invalid fight origin", "Origen de la pelea no válido"],
  ["Esse monstro não está lutando com você", "That monster isn't fighting you", "Ese monstruo no está peleando contigo"],
  ["Luta não encontrada", "Fight not found", "Pelea no encontrada"],
  ["A luta expirou", "The fight expired", "La pelea expiró"],
  ["Essa luta já terminou", "That fight is already over", "Esa pelea ya terminó"],
  ["Não foi possível conferir a luta", "The fight couldn't be verified", "No se pudo verificar la pelea"],
  ["A gravação da luta não bate com o tempo", "The fight recording doesn't match the time", "La grabación de la pelea no coincide con el tiempo"],
  ["Hóspede sem vida", "Your resident isn't alive", "Tu huésped no tiene vida"],
  ["A luta de treino é só no prólogo", "The training fight is only in the prologue", "La pelea de entrenamiento es solo en el prólogo"],
  ["Não foi possível", "That didn't work", "No fue posible"],
  ["Não deu certo agora. Tente de novo.", "That didn't work. Try again.", "No funcionó. Inténtalo de nuevo."],
  // Chat e jogadores
  ["Chat indisponível", "Chat unavailable", "Chat no disponible"],
  ["Cursor inválido", "Invalid cursor", "Cursor no válido"],
  // Placar semanal (lore v2 N1)
  ["Semana inválida", "Invalid week", "Semana no válida"],
  ["Mensagem não enviada", "Message not sent", "Mensaje no enviado"],
  ["Mensagem não encontrada", "Message not found", "Mensaje no encontrado"],
  ["Jogador não encontrado", "Player not found", "Jugador no encontrado"],
  ["Esse jogador não está mais aqui", "That player is no longer here", "Ese jugador ya no está aquí"],
  ["Esse é você", "That's you", "Ese eres tú"],
  ["Mensagem vazia", "Empty message", "Mensaje vacío"],
  ["Mensagem não pode ser vazia", "The message can't be empty", "El mensaje no puede estar vacío"],
  ["Limite de envio excedido. Aguarde alguns segundos.", "Sending limit reached. Wait a few seconds.", "Límite de envío superado. Espera unos segundos."],
  ["Conversa não encontrada", "Conversation not found", "Conversación no encontrada"],
  ["Sem permissão para esta conversa", "You don't have access to this conversation", "No tienes acceso a esta conversación"],
  ["Sem permissão para apagar", "You can't delete this", "No puedes borrar esto"],
  ["Não dá pra denunciar a própria mensagem", "You can't report your own message", "No puedes denunciar tu propio mensaje"],
  ["Sala não encontrada", "Room not found", "Sala no encontrada"],
  ["Usuário não autenticado", "You're not signed in", "No has iniciado sesión"],
  ["Destinatário não está disponível para mensagens", "This person can't receive messages", "Esta persona no puede recibir mensajes"],
  ["Não é possível enviar mensagem para si mesmo", "You can't message yourself", "No puedes enviarte un mensaje a ti mismo"],
  ["Não é possível abrir conversa consigo mesmo", "You can't start a conversation with yourself", "No puedes abrir una conversación contigo mismo"],
  // Equipamento e forja
  ["Pedido sem chave", "Request without a key", "Pedido sin clave"],
  ["Item desconhecido", "Unknown item", "Objeto desconocido"],
  ["Esse item não está à venda", "That item isn't for sale", "Ese objeto no está a la venta"],
  ["Moedas insuficientes", "Not enough coins", "Monedas insuficientes"],
  ["Nível de aventura insuficiente", "Adventure level too low", "Nivel de aventura insuficiente"],
  ["Essa arma é de outra classe", "That weapon belongs to another class", "Esa arma es de otra clase"],
  ["Você não tem esse item", "You don't have that item", "No tienes ese objeto"],
  ["Esse item não se equipa", "That item can't be equipped", "Ese objeto no se puede equipar"],
  ["Receita desconhecida", "Unknown recipe", "Receta desconocida"],
  ["Faltam materiais", "You're missing materials", "Faltan materiales"],
  ["Você ainda não aprendeu essa receita", "You haven't learned that recipe yet", "Aún no has aprendido esa receta"],
  ["Já está no máximo", "Already at the maximum", "Ya está al máximo"],
  ["Tire o item antes de reciclar", "Unequip the item before recycling it", "Quítate el objeto antes de reciclarlo"],
  ["Escolha a classe primeiro", "Choose your class first", "Elige tu clase primero"],
  ["Esse item aguarda uma decisão de refino", "That item is waiting for a refinement decision", "Ese objeto espera una decisión de refinado"],
  ["Confira a prévia atualizada antes de pagar pelo refino", "Check the updated preview before paying for the refinement", "Revisa la vista previa actualizada antes de pagar el refinado"],
  ["Proposta de refino não encontrada", "Refinement offer not found", "Propuesta de refinado no encontrada"],
  ["Informe aceitar ou recusar", "Choose accept or decline", "Indica aceptar o rechazar"],
  ["Essa proposta já foi encerrada", "That offer is already closed", "Esa propuesta ya está cerrada"],
  ["O equipamento mudou; recuse a proposta e confira uma nova prévia", "The gear changed; decline the offer and check a new preview", "El equipo cambió; rechaza la propuesta y revisa una nueva vista previa"],
  ["Essa chave já foi usada para outra ação", "That key was already used for another action", "Esa clave ya se usó para otra acción"],
  ["Use esse item na ação indicada no catálogo", "Use that item in the action shown in the catalog", "Usa ese objeto en la acción indicada en el catálogo"],
  // Caixa de entrada
  ["Tipo de mensagem inválido", "Invalid message type", "Tipo de mensaje no válido"],
  ["Título obrigatório (até 120 caracteres)", "Title required (up to 120 characters)", "Título obligatorio (hasta 120 caracteres)"],
  ["Texto longo demais (até 2000 caracteres)", "Text too long (up to 2000 characters)", "Texto demasiado largo (hasta 2000 caracteres)"],
  ["Presente inválido", "Invalid gift", "Regalo no válido"],
  ["Destinatário não encontrado", "Recipient not found", "Destinatario no encontrado"],
  // Vida
  ["Item não encontrado", "Item not found", "Objeto no encontrado"],
  ["Seu hóspede morreu", "Your resident died", "Tu huésped murió"],
  ["Ele está internado no hospital", "Your resident is in the hospital", "Tu huésped está internado en el hospital"],
  ["Ele está preso na delegacia", "Your resident is locked up at the police station", "Tu huésped está detenido en la comisaría"],
  ["Ele está dormindo", "Your resident is asleep", "Tu huésped está durmiendo"],
  ["Ele está cheio", "Your resident is full", "Tu huésped está lleno"],
  ["Atividade inválida", "Invalid activity", "Actividad no válida"],
  ["Quantidade de horas inválida", "Invalid number of hours", "Cantidad de horas no válida"],
  ["Para deitar ou dormir, vá até uma cama", "To lie down or sleep, go to a bed", "Para acostarte o dormir, ve a una cama"],
  ["Com estimulante no corpo ele não consegue dormir", "With stimulants in the body your resident can't sleep", "Con estimulantes en el cuerpo tu huésped no puede dormir"],
  ["Skin não encontrada", "Skin not found", "Skin no encontrada"],
  ["Você ainda não tem essa skin", "You don't have that skin yet", "Aún no tienes esa skin"],
  ["Este personagem tem visual próprio", "This character has its own look", "Este personaje tiene aspecto propio"],
  ["Seu hóspede está vivo", "Your resident is alive", "Tu huésped está vivo"],
  ["Acabou na geladeira", "That ran out in the fridge", "Se acabó en la nevera"],
  ["A geladeira não cabe mais desse item", "The fridge can't hold more of that item", "En la nevera no cabe más de ese objeto"],
  ["Quantidade inválida", "Invalid quantity", "Cantidad no válida"],
  ["Pedido inválido", "Invalid request", "Pedido no válido"],
  ["Poléns insuficientes", "Not enough Pollens", "Poléns insuficientes"],
  ["Este produto é exclusivo de Poléns", "This product can only be bought with Pollens", "Este producto es exclusivo de Poléns"],
  ["Presente não encontrado", "Gift not found", "Regalo no encontrado"],
  ["Treino é na academia; estudo, na universidade, biblioteca ou escola; reza, na igreja — dentro do prédio", "Train at the gym; study at the university, library or school; pray at the church — inside the building", "Se entrena en el gimnasio; se estudia en la universidad, biblioteca o escuela; se reza en la iglesia — dentro del edificio"],
  ["Isso não tem no cardápio", "That's not on the menu", "Eso no está en el menú"],
  ["Você precisa estar lá dentro", "You need to be inside", "Tienes que estar adentro"],
  ["Compras para a geladeira são no supermercado do centro", "Fridge shopping is at the downtown supermarket", "Las compras para la nevera son en el supermercado del centro"],
  // mm3d-72: apelidos
  ["O apelido precisa ter de 2 a 20 letras", "The nickname must have 2 to 20 letters", "El apodo debe tener de 2 a 20 letras"],
  // Missões
  ["Ação inválida", "Invalid action", "Acción no válida"],
  // B7: aba Ranking
  ["Ranking não encontrado", "Ranking not found", "Ranking no encontrado"],
  ["Missão concluída", "Quest completed", "Misión completada"],
  ["O objetivo ainda não foi cumprido", "The objective hasn't been met yet", "El objetivo aún no se ha cumplido"],
  // lore v2 F3: capítulo abre pelo nível do treinador
  ["O próximo capítulo abre num nível maior do treinador", "The next chapter opens at a higher trainer level", "El próximo capítulo se abre con un nivel mayor de entrenador"],
  // lore v2 F4: conversa com NPC (talk:<npc>)
  ["Pessoa desconhecida", "Unknown person", "Persona desconocida"],
  ["Chegue perto dessa pessoa para conversar", "Get close to this person to talk", "Acércate a esta persona para hablar"],
  // lore v2 F5: o Arquivo e os vídeos
  ["Texto do Arquivo desconhecido", "Unknown Archive text", "Texto del Archivo desconocido"],
  ["Esse texto do Arquivo ainda está trancado", "That Archive text is still locked", "Ese texto del Archivo todavía está bloqueado"],
  ["Esse texto só se abre no lugar dele", "This text only opens where it is kept", "Este texto solo se abre en su lugar"],
  ["Esse vídeo não tem lugar no jogo", "That video has no place in the game", "Ese video no tiene lugar en el juego"],
  ["Envie o vídeo ou a imagem", "Send the video or the image", "Envía el video o la imagen"],
  // lore v2 F6: prédios por nível do treinador
  ["Esse lugar ainda está fechado para o seu nível de treinador", "This place is still closed for your trainer level", "Este lugar todavía está cerrado para tu nivel de entrenador"],
  ["Missão de prédio desconhecida", "Unknown building mission", "Misión de edificio desconocida"],
  ["Essa missão abre junto com o prédio", "This mission opens along with the building", "Esta misión se abre junto con el edificio"],
  // Lugares e classes
  ["Escolha sua classe", "Choose your class", "Elige tu clase"],
  ["Classe inválida", "Invalid class", "Clase no válida"],
  ["Sem residência ativa", "No active residence", "Sin residencia activa"],
  ["Casa inválida", "Invalid house", "Casa no válida"],
  ["Você precisa estar na rua do bairro", "You need to be on the neighborhood street", "Tienes que estar en la calle del barrio"],
  ["Casa não encontrada", "House not found", "Casa no encontrada"],
  ["Esta casa precisa de convite do morador", "This house needs the resident's invite", "Esta casa necesita la invitación del residente"],
  ["De carro não dá para entrar em casa — desça dele primeiro", "You can't enter a house by car — get out first", "En coche no se puede entrar en casa — bájate primero"],
  ["Chegue mais perto da porta", "Get closer to the door", "Acércate más a la puerta"],
  ["Este nível ainda não tem interior", "This level has no interior yet", "Este nivel aún no tiene interior"],
  ["Pare antes de entrar em casa", "Stop before entering the house", "Detente antes de entrar en casa"],
  ["Não foi possível entrar com o veículo", "Couldn't enter with the vehicle", "No se pudo entrar con el vehículo"],
  ["Você não está numa casa", "You're not in a house", "No estás en una casa"],
  ["Vá até a porta para sair", "Go to the door to leave", "Ve a la puerta para salir"],
  ["O centro não abriu agora. Tente de novo.", "Downtown didn't open just now. Try again.", "El centro no abrió ahora. Inténtalo de nuevo."],
  ["Você já está no centro", "You're already downtown", "Ya estás en el centro"],
  ["Saia para a rua do bairro para ir ao centro", "Go out to the neighborhood street to head downtown", "Sal a la calle del barrio para ir al centro"],
  ["Encerre a visita antes de ir ao centro", "End the visit before going downtown", "Termina la visita antes de ir al centro"],
  ["Você já está a caminho do centro", "You're already on your way downtown", "Ya vas de camino al centro"],
  ["Pare antes de ir ao centro", "Stop before going downtown", "Detente antes de ir al centro"],
  ["Não foi possível levar o veículo", "Couldn't bring the vehicle", "No se pudo llevar el vehículo"],
  ["Você não está no centro", "You're not downtown", "No estás en el centro"],
  ["Pare antes de voltar para casa", "Stop before going home", "Detente antes de volver a casa"],
  ["Chegue perto da porta do jetpack", "Get close to the jetpack door", "Acércate a la puerta del jetpack"],
  ["O jetpack não abriu agora.", "The jetpack didn't open just now.", "El jetpack no abrió ahora."],
  ["Modo inválido", "Invalid mode", "Modo no válido"],
  ["Chegue perto da porta do Paint", "Get close to the Paint door", "Acércate a la puerta de Paint"],
  ["O Paint não abriu agora.", "Paint didn't open just now.", "Paint no abrió ahora."],
  ["Chegue perto da porta da corrida", "Get close to the race door", "Acércate a la puerta de la carrera"],
  ["A corrida em grupo não abriu agora.", "The group race didn't open just now.", "La carrera en grupo no abrió ahora."],
  ["Chegue perto da porta do Rolê Noturno", "Get close to the Night Ride door", "Acércate a la puerta del Paseo Nocturno"],
  ["O rolê em grupo não abriu agora.", "The group ride didn't open just now.", "El paseo en grupo no abrió ahora."],
  ["Chegue perto da porta da Gincana", "Get close to the Party Dash door", "Acércate a la puerta de la Gincana"],
  ["A gincana em grupo não abriu agora.", "The group Party Dash didn't open just now.", "La gincana en grupo no abrió ahora."],
  ["Nível deve ser um número de 1 a {n}", "Level must be a number from 1 to {n}", "El nivel debe ser un número de 1 a {n}"],
  ["Este nível ainda não tem modelo", "This level has no model yet", "Este nivel aún no tiene modelo"],
  ["Peça para todos saírem da casa antes de trocar o nível", "Ask everyone to leave the house before changing the level", "Pide a todos que salgan de la casa antes de cambiar el nivel"],
  // Visitas
  ["Escolha quem convidar", "Choose who to invite", "Elige a quién invitar"],
  ["Pessoa não encontrada", "Person not found", "Persona no encontrada"],
  ["Você não pode convidar a si mesmo", "You can't invite yourself", "No puedes invitarte a ti mismo"],
  ["Esta pessoa ainda não tem acesso ao Meu Mundo", "This person doesn't have access to Meu Mundo yet", "Esta persona aún no tiene acceso a Meu Mundo"],
  ["Esta pessoa não está no Meu Mundo agora", "This person isn't in Meu Mundo right now", "Esta persona no está en Meu Mundo ahora"],
  ["Você está visitando outra casa", "You're visiting another house", "Estás visitando otra casa"],
  ["Muitos convites seguidos. Espere um pouco.", "Too many invites in a row. Wait a little.", "Demasiadas invitaciones seguidas. Espera un poco."],
  ["Esta pessoa já está numa visita", "This person is already on a visit", "Esta persona ya está en una visita"],
  ["Você já tem um convite pendente ou uma visita em andamento", "You already have a pending invite or a visit in progress", "Ya tienes una invitación pendiente o una visita en curso"],
  ["Este convite expirou", "This invite expired", "Esta invitación expiró"],
  ["Você já está numa visita", "You're already on a visit", "Ya estás en una visita"],
  ["Convite não encontrado", "Invite not found", "Invitación no encontrada"],
  ["Este convite não vale mais", "This invite is no longer valid", "Esta invitación ya no es válida"],
  ["Este convite não está mais pendente", "This invite is no longer pending", "Esta invitación ya no está pendiente"],
  ["Visita não encontrada", "Visit not found", "Visita no encontrada"],
  ["Esta visita já terminou", "This visit is already over", "Esta visita ya terminó"],
  ["Este convite já foi aceito", "This invite was already accepted", "Esta invitación ya fue aceptada"],
  ["O anfitrião não mora mais nesta casa", "The host no longer lives in this house", "El anfitrión ya no vive en esta casa"],
  ["O anfitrião está visitando outra casa", "The host is visiting another house", "El anfitrión está visitando otra casa"],
  // B3 (mig 340): personagens, cápsula e fusão
  ["Personagem não encontrado", "Character not found", "Personaje no encontrado"],
  ["Esse personagem não está na cápsula", "That character is not in the capsule", "Ese personaje no está en la cápsula"],
  ["Ele está internado ou preso: espere sair para trocar", "They are in hospital or jail: wait until they're out to swap", "Está internado o preso: espera a que salga para cambiar"],
  ["Escolha dois personagens diferentes", "Pick two different characters", "Elige dos personajes distintos"],
  ["Só personagens vivos podem fundir", "Only living characters can fuse", "Solo los personajes vivos pueden fusionarse"],
  ["Só dois adultos podem fundir", "Only two adults can fuse", "Solo dos adultos pueden fusionarse"],
  ["A espécie do filho tem que ser a de um dos pais", "The child's species must be one of the parents'", "La especie del hijo tiene que ser la de uno de los padres"],
  ["Sexo inválido", "Invalid sex", "Sexo inválido"],
  ["A cápsula está cheia", "The capsule is full", "La cápsula está llena"],
  ["Genética não encontrada", "Genetics not found", "Genética no encontrada"],
  ["O congelador de genéticas está cheio", "The genetics freezer is full", "El congelador de genéticas está lleno"],
  ["Espécie inválida", "Invalid species", "Especie inválida"],
  ["Só para administrador", "Administrators only", "Solo para administradores"],
  // A8: compartilhar o Meu Mundo (afiliado)
  ["Não autenticado", "Not authenticated", "No autenticado"],
  ["Seu cadastro de afiliado está suspenso", "Your affiliate account is suspended", "Tu registro de afiliado está suspendido"],
  ["Não foi possível gerar seu código", "Could not generate your code", "No fue posible generar tu código"],
  // B12: Laboratório de Criogenia
  ["Ele já tem 15 anos ou mais", "They are already 15 or older", "Ya tiene 15 años o más"],
  ["Esse personagem não está vivo nem na cápsula", "That character is neither alive nor in the capsule", "Ese personaje no está vivo ni en la cápsula"],
  // Vendedor e Salão
  ["Converse com o vendedor na sala dele, no supermercado do centro", "Talk to the salesman in his office, at the downtown supermarket", "Habla con el vendedor en su sala, en el supermercado del centro"],
  ["Você ainda não tem casa no bairro", "You don't have a house in the neighborhood yet", "Aún no tienes casa en el barrio"],
  ["Esse nível de casa não existe", "That house level doesn't exist", "Ese nivel de casa no existe"],
  ["A sua casa já é desse nível", "Your house is already that level", "Tu casa ya es de ese nivel"],
  ["Peça para todos saírem da sua casa antes de trocar", "Ask everyone to leave your house before changing it", "Pide a todos que salgan de tu casa antes de cambiarla"],
  ["Essa cor não existe", "That color doesn't exist", "Ese color no existe"],
  ["Local sem interior", "This place has no interior", "Lugar sin interior"],
  ["O Salão é de quem ficou em 1º por três meses seguidos.", "The Hall belongs to those who came 1st for three months in a row.", "El Salón es de quienes quedaron 1.º durante tres meses seguidos."],
  // Lore v2 N3: domingo na estátua
  ["A estátua só recebe néctar no domingo", "The statue only takes nectar on Sunday", "La estatua solo recibe néctar el domingo"],
  ["Chegue ao pé da estátua do seu deus", "Get to the foot of your god's statue", "Llega al pie de la estatua de tu dios"],
  ["Você não tem néctar para entregar", "You have no nectar to deliver", "No tienes néctar para entregar"],
  ["Valores inválidos para a meta", "Invalid values for the goal", "Valores inválidos para la meta"],
  // Lore v2 D1: os Domínios
  ["Domínio desconhecido", "Unknown Domain", "Dominio desconocido"],
  ["Esse Domínio ainda está fechado", "This Domain is still closed", "Este Dominio todavía está cerrado"],
  ["Esse setor ainda está fechado", "This sector is still closed", "Este sector todavía está cerrado"],
  // lore v2 C5: Pedraverde e o Golem (POST /domains/place)
  ["Lugar desconhecido", "Unknown place", "Lugar desconocido"],
  ["Chegue à clareira primeiro", "Reach the clearing first", "Llega primero al claro"],
  // trilha E2: instâncias de equipamento
  ["Equipamento não encontrado", "Equipment not found", "Equipo no encontrado"],
  // lore v2 N4: o deus solto
  ["Esse deus não está solto", "That god isn’t loose", "Ese dios no está suelto"],
  ["Esse deus não caça o seu povo", "That god doesn’t hunt your people", "Ese dios no caza a tu pueblo"],
  ["O deus não te alcançou", "The god hasn’t caught you", "El dios no te alcanzó"],
  ["Escolha a sua classe antes", "Choose your class first", "Elige tu clase primero"],
  ["Povo inválido", "Invalid people", "Pueblo no válido"],
  // trilha E6: arma de duas mãos
  ["Sua arma usa as duas mãos", "Your weapon takes both hands", "Tu arma usa las dos manos"],
  // trilha E8: conversão de fragmento
  ["Esse item não é um fragmento", "That item isn't a fragment", "Ese objeto no es un fragmento"],
  // trilha E9
  ["A peça precisa da Ascensão para passar do +10", "The item needs Ascension to go past +10", "La pieza necesita la Ascensión para pasar de +10"],
  ["O refino sorteado acabou: use o aprimoramento garantido", "Random refining is gone: use guaranteed enhancement", "El refinado al azar terminó: usa la mejora garantizada"],
  // trilha E11
  ["Peça travada: destrave antes de desmontar", "Locked item: unlock it before salvaging", "Pieza bloqueada: desbloquéala antes de desmontar"],
  ["Tire a peça de quem a veste antes de desmontar", "Take the item off whoever wears it before salvaging", "Quítale la pieza a quien la lleva antes de desmontar"],
  ["Confirme a desmontagem de uma peça rara ou acima", "Confirm salvaging a rare or better item", "Confirma el desmontaje de una pieza rara o superior"],
  ["Esses materiais não se transmutam um no outro", "These materials can't be transmuted into each other", "Estos materiales no se transmutan entre sí"],
]
const MENU = { menuLanguage: ["Idioma", "Language", "Idioma"] }
const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const ns = (dict.MeuMundoServer = dict.MeuMundoServer || {})
  let added = 0
  for (const row of ROWS) if (!(row[0] in ns)) { ns[row[0]] = row[i]; added++ }
  for (const [k, v] of Object.entries(MENU)) if (!(k in dict.MeuMundo)) { dict.MeuMundo[k] = v[i]; added++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(`${loc}: +${added}`)
})
