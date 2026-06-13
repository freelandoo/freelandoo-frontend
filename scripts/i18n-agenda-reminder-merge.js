// Estende o namespace "Agenda" com as chaves do lembrete de horário (config na
// aba Disponibilidade + badges/wa.me na lista + página de confirmação do
// cliente). Idempotente, fill-if-absent. Placeholders {h}/{client}/{date}/
// {time}/{name}/{pro} preservados. Rodar:
//   node scripts/i18n-agenda-reminder-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const AGENDA = {
  // Config do lembrete (aba Disponibilidade)
  reminderSaved: ["Lembrete atualizado!", "Reminder updated!", "¡Recordatorio actualizado!"],
  reminderConfigTitle: ["Lembrete automático", "Automatic reminder", "Recordatorio automático"],
  reminderConfigDesc: [
    "Avisa o cliente por e-mail antes do horário — reduz falta. Você ainda pode lembrar no WhatsApp com 1 toque na lista.",
    "Emails the client before the appointment — cuts no-shows. You can still remind them on WhatsApp with one tap in the list.",
    "Avisa al cliente por correo antes de la cita — reduce ausencias. También puedes recordar por WhatsApp con un toque en la lista.",
  ],
  reminderEnabledLabel: ["Enviar lembrete", "Send reminder", "Enviar recordatorio"],
  reminderHoursLabel: ["Antecedência", "Lead time", "Antelación"],
  hoursBefore: ["{h}h antes", "{h}h before", "{h}h antes"],
  // Badges/ação na lista de agendamentos
  clientConfirmed: ["Cliente confirmou", "Client confirmed", "Cliente confirmó"],
  clientReschedule: ["Quer remarcar", "Wants to reschedule", "Quiere reprogramar"],
  reminderSent: ["Lembrete enviado", "Reminder sent", "Recordatorio enviado"],
  whatsappReminder: ["Lembrar no WhatsApp", "Remind on WhatsApp", "Recordar por WhatsApp"],
  waMessage: [
    "Oi {client}! Passando pra lembrar do seu horário em {date} às {time}. Você confirma?",
    "Hi {client}! Just a reminder about your appointment on {date} at {time}. Can you confirm?",
    "¡Hola {client}! Te recuerdo tu cita el {date} a las {time}. ¿La confirmas?",
  ],
  // Página de confirmação do cliente
  confirmEyebrow: ["lembrete de horário", "appointment reminder", "recordatorio de cita"],
  confirmTitle: ["Seu horário", "Your appointment", "Tu cita"],
  confirmLoading: ["Carregando...", "Loading...", "Cargando..."],
  confirmNotFound: ["Link inválido ou expirado.", "Invalid or expired link.", "Enlace inválido o expirado."],
  confirmGreeting: ["Olá, {name}!", "Hi, {name}!", "¡Hola, {name}!"],
  confirmLead: ["Lembrete do seu horário com {pro}.", "A reminder about your appointment with {pro}.", "Recordatorio de tu cita con {pro}."],
  confirmConfirmBtn: ["Confirmar presença", "Confirm attendance", "Confirmar asistencia"],
  confirmRescheduleBtn: ["Preciso remarcar", "I need to reschedule", "Necesito reprogramar"],
  confirmedTitle: ["Presença confirmada!", "Attendance confirmed!", "¡Asistencia confirmada!"],
  confirmedDesc: ["Obrigado! Te esperamos no horário.", "Thank you! We'll see you then.", "¡Gracias! Te esperamos a la hora."],
  rescheduleTitle: ["Tudo bem!", "No problem!", "¡Sin problema!"],
  rescheduleDesc: [
    "Avisamos o profissional que você precisa remarcar.",
    "We let the professional know you need to reschedule.",
    "Avisamos al profesional que necesitas reprogramar.",
  ],
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
