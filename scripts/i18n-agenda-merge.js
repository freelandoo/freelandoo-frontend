// Namespace "Agenda" — redesign tabloide da página de agenda do subperfil/clan
// (AgendaPageClient + AgendaBookingsExperience + AgendaBookingsPanel +
// AgendaMonthCalendar). Idempotente e não-destrutivo: só ADICIONA chaves
// ausentes, nunca sobrescreve. Placeholders {x} preservados. Rodar:
//   node scripts/i18n-agenda-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const AGENDA = {
  // Hero / navegação
  back: ["Voltar", "Back", "Volver"],
  eyebrow: ["a sua agenda", "your schedule", "tu agenda"],
  clanEyebrow: ["agenda do clan", "clan schedule", "agenda del clan"],
  title: ["Agenda", "Schedule", "Agenda"],
  clanTitle: ["Operação", "Operation", "Operación"],
  subtitle: [
    "Disponibilidade, serviços e visão clara dos seus compromissos.",
    "Availability, services and a clear view of your appointments.",
    "Disponibilidad, servicios y una visión clara de tus compromisos.",
  ],
  tabAvailability: ["Disponibilidade", "Availability", "Disponibilidad"],
  tabServices: ["Serviços", "Services", "Servicios"],
  tabBookings: ["Agendamentos", "Bookings", "Reservas"],
  // Mensagens (toast)
  msgRulesSaved: ["Disponibilidade semanal salva!", "Weekly availability saved!", "¡Disponibilidad semanal guardada!"],
  msgSaveError: ["Erro ao salvar", "Error saving", "Error al guardar"],
  msgConnError: ["Erro de conexão", "Connection error", "Error de conexión"],
  msgPickDate: ["Selecione uma data", "Select a date", "Selecciona una fecha"],
  msgOverrideSaved: ["Exceção salva!", "Exception saved!", "¡Excepción guardada!"],
  msgError: ["Erro", "Error", "Error"],
  msgServiceRemoved: ["Serviço removido", "Service removed", "Servicio eliminado"],
  msgServiceUpdated: ["Serviço atualizado!", "Service updated!", "¡Servicio actualizado!"],
  msgServiceCreated: ["Serviço criado!", "Service created!", "¡Servicio creado!"],
  confirmRemoveService: ['Remover serviço "{name}"?', 'Remove service "{name}"?', '¿Eliminar el servicio "{name}"?'],
  // Disponibilidade
  availabilityTitle: ["Disponibilidade semanal", "Weekly availability", "Disponibilidad semanal"],
  availabilityDesc: ["Dias e horários em que você atende.", "Days and times when you're available.", "Días y horarios en que atiendes."],
  availabilityDescClan: ["Dias e horários em que o clan atende.", "Days and times when the clan is available.", "Días y horarios en que el clan atiende."],
  noService: ["sem atendimento", "unavailable", "sin atención"],
  startTime: ["Horário de início", "Start time", "Hora de inicio"],
  endTime: ["Horário de término", "End time", "Hora de término"],
  slotDuration: ["Duração do slot", "Slot duration", "Duración del turno"],
  slotBuffer: ["Intervalo entre slots", "Buffer between slots", "Intervalo entre turnos"],
  bufferShort: ["Int", "Gap", "Int"],
  save: ["Salvar", "Save", "Guardar"],
  saving: ["Salvando…", "Saving…", "Guardando…"],
  exceptions: ["Exceções", "Exceptions", "Excepciones"],
  // Serviços
  servicesDesc: [
    "Cadastre os serviços que você oferece. Apenas ativos aparecem para o cliente.",
    "Register the services you offer. Only active ones show to the client.",
    "Registra los servicios que ofreces. Solo los activos aparecen para el cliente.",
  ],
  servicesDescClan: [
    "Cadastre os serviços que o clan oferece. Apenas ativos aparecem para o cliente.",
    "Register the services the clan offers. Only active ones show to the client.",
    "Registra los servicios que ofrece el clan. Solo los activos aparecen para el cliente.",
  ],
  addService: ["Adicionar serviço", "Add service", "Agregar servicio"],
  noServicesTitle: ["Nenhum serviço cadastrado.", "No services registered.", "Ningún servicio registrado."],
  noServicesHint: ['Clique em "Adicionar serviço" para começar.', 'Click "Add service" to get started.', 'Haz clic en "Agregar servicio" para empezar.'],
  inactive: ["Inativo", "Inactive", "Inactivo"],
  perMember: ["{value}/membro", "{value}/member", "{value}/miembro"],
  noMembersConfigured: ["Sem membros configurados", "No members configured", "Sin miembros configurados"],
  allMembers: ["Todos os membros", "All members", "Todos los miembros"],
  deactivate: ["Desativar", "Deactivate", "Desactivar"],
  activate: ["Ativar", "Activate", "Activar"],
  edit: ["Editar", "Edit", "Editar"],
  remove: ["Remover", "Remove", "Eliminar"],
  minutesShort: ["min", "min", "min"],
  // Modal de exceções
  exceptionsTitle: ["Exceções por data", "Date exceptions", "Excepciones por fecha"],
  exceptionsDesc: ["Bloqueie dias inteiros ou ajuste horários específicos.", "Block entire days or adjust specific times.", "Bloquea días enteros o ajusta horarios específicos."],
  close: ["Fechar", "Close", "Cerrar"],
  date: ["Data", "Date", "Fecha"],
  blockWholeDay: ["Bloquear dia inteiro", "Block whole day", "Bloquear día entero"],
  note: ["Observação", "Note", "Observación"],
  notePlaceholder: ["Ex: Feriado, viagem...", "E.g. Holiday, trip...", "Ej: Feriado, viaje..."],
  add: ["Adicionar", "Add", "Agregar"],
  noExceptions: ["Nenhuma exceção cadastrada.", "No exceptions registered.", "Ninguna excepción registrada."],
  blocked: ["Bloqueado", "Blocked", "Bloqueado"],
  custom: ["Personalizado", "Custom", "Personalizado"],
  // Dias da semana
  daySun: ["Domingo", "Sunday", "Domingo"],
  dayMon: ["Segunda", "Monday", "Lunes"],
  dayTue: ["Terça", "Tuesday", "Martes"],
  dayWed: ["Quarta", "Wednesday", "Miércoles"],
  dayThu: ["Quinta", "Thursday", "Jueves"],
  dayFri: ["Sexta", "Friday", "Viernes"],
  daySat: ["Sábado", "Saturday", "Sábado"],
  abbrSun: ["DOM", "SUN", "DOM"],
  abbrMon: ["SEG", "MON", "LUN"],
  abbrTue: ["TER", "TUE", "MAR"],
  abbrWed: ["QUA", "WED", "MIÉ"],
  abbrThu: ["QUI", "THU", "JUE"],
  abbrFri: ["SEX", "FRI", "VIE"],
  abbrSat: ["SÁB", "SAT", "SÁB"],
  // Painel de agendamentos
  bookingsEyebrow: ["Agendamentos", "Bookings", "Reservas"],
  currentWeek: ["Semana atual", "Current week", "Semana actual"],
  daySubtitle: ["Horários do dia selecionado.", "Times for the selected day.", "Horarios del día seleccionado."],
  weekSubtitle: ["Visualização agrupada por dia da semana.", "Grouped view by day of the week.", "Vista agrupada por día de la semana."],
  viewWeek: ["Ver semana", "View week", "Ver semana"],
  thisWeek: ["Esta semana", "This week", "Esta semana"],
  prevWeek: ["Semana anterior", "Previous week", "Semana anterior"],
  nextWeek: ["Próxima semana", "Next week", "Próxima semana"],
  emptyBookingsTitle: ["Nenhum agendamento neste período", "No bookings in this period", "Ninguna reserva en este período"],
  emptyBookingsDesc: [
    "Escolha outro dia no calendário ou navegue entre semanas para ver mais compromissos.",
    "Pick another day on the calendar or navigate between weeks to see more appointments.",
    "Elige otro día en el calendario o navega entre semanas para ver más compromisos.",
  ],
  statusConfirmed: ["Confirmado", "Confirmed", "Confirmado"],
  statusInProgress: ["Em andamento", "In progress", "En curso"],
  statusCompleted: ["Finalizado", "Completed", "Finalizado"],
  statusCanceled: ["Cancelado", "Canceled", "Cancelado"],
  statusNoShow: ["Não compareceu", "No-show", "No asistió"],
  serviceFallback: ["Serviço", "Service", "Servicio"],
  amount: ["Valor", "Amount", "Valor"],
  loadErrorBookings: [
    "Não foi possível carregar os agendamentos agora. Tente novamente em instantes.",
    "Couldn't load bookings right now. Try again in a moment.",
    "No se pudieron cargar las reservas ahora. Inténtalo de nuevo en un momento.",
  ],
  configureAgenda: ["Configurar agenda", "Configure schedule", "Configurar agenda"],
  tabCalendar: ["Calendário", "Calendar", "Calendario"],
  // Legenda do calendário
  legendTodayLabel: ["Hoje:", "Today:", "Hoy:"],
  legendTodayDesc: ["contorno forte no número.", "bold outline on the number.", "contorno fuerte en el número."],
  legendDotLabel: ["Ponto sob o dia:", "Dot under the day:", "Punto bajo el día:"],
  legendDotDesc: ["agendamentos (mais intenso = mais cheio).", "bookings (more intense = busier).", "reservas (más intenso = más lleno)."],
}

const GROUPS = { Agenda: AGENDA }

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
