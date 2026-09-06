/**
 * Merge idempotente (fill-if-absent) das chaves do botão "Membros" da academia:
 * o pill rosa do headcard, a página de membros com a aba "Treinos por data" e o
 * alerta de ficha vencida (modal + bolinha + marca na grade).
 *
 * Uso: node scripts/i18n-academy-members-merge.js
 */
const fs = require("fs")
const path = require("path")

const LOCALES = ["pt-BR", "en", "es"]
const DIR = path.join(__dirname, "..", "messages")

const ACADEMIES = {
  membersPill: ["Membros", "Members", "Miembros"],
  membersPillAria: [
    "Abrir membros vinculados e treinos por data",
    "Open linked members and training by date",
    "Abrir miembros vinculados y entrenamientos por fecha",
  ],
  membersPageTitle: ["Membros vinculados", "Linked members", "Miembros vinculados"],
  membersDenied: [
    "Só o dono e os professores desta academia veem esta página.",
    "Only this gym's owner and trainers can see this page.",
    "Solo el dueño y los profesores de este gimnasio ven esta página.",
  ],
  tabMembers: ["Membros", "Members", "Miembros"],
  tabTraining: ["Treinos por data", "Training by date", "Entrenamientos por fecha"],
  backToAcademy: ["Voltar pra academia", "Back to the gym", "Volver al gimnasio"],
  expiredTitle: ["Fichas vencidas", "Expired plans", "Rutinas vencidas"],
  expiredIntro: [
    "{n} aluno(s) estão com a mesma ficha há {d} dias ou mais. Hora de montar um treino novo.",
    "{n} student(s) have been on the same plan for {d} days or more. Time for a new workout.",
    "{n} alumno(s) llevan con la misma rutina {d} días o más. Hora de armar un entrenamiento nuevo.",
  ],
  expiredDays: ["{n} dias", "{n} days", "{n} días"],
  expiredLater: ["Agora não", "Not now", "Ahora no"],
  expiredCta: ["Ver treinos por data", "See training by date", "Ver entrenamientos por fecha"],
  expiredDot: [
    "Há alunos com a ficha vencida",
    "Some students have an expired plan",
    "Hay alumnos con la rutina vencida",
  ],
  expiredBadge: ["Ficha vencida", "Expired plan", "Rutina vencida"],
  noPlanName: ["sem nome", "no name", "sin nombre"],
}

const WORKOUTS = {
  expiredShort: ["vencida", "expired", "vencida"],
  expiredHint: [
    "Mesma ficha há {d} dias ou mais — hora de montar um treino novo.",
    "Same plan for {d} days or more — time for a new workout.",
    "Misma rutina desde hace {d} días o más — hora de armar un entrenamiento nuevo.",
  ],
}

let touched = 0
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, entries] of [
    ["Academies", ACADEMIES],
    ["Workouts", WORKOUTS],
  ]) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(entries)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[idx]
        touched += 1
      }
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`)
})

console.log(`i18n academy members: ${touched} chave(s) adicionada(s).`)
