// Esportes — checklist do treino (2026-10-27): placar "2/6", barra até
// concluir, check grande. Namespace "Fitness". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-esportes-checklist-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FITNESS = {
  chkExercises: ["exercícios", "exercises", "ejercicios"],
  chkLeft: ["Faltam {n}", "{n} to go", "Faltan {n}"],
  chkNow: ["Agora", "Now", "Ahora"],
  chkFooter: ["{done} de {total} concluídos", "{done} of {total} done", "{done} de {total} completados"],
  chkRowTodo: [
    "{name}, {sets} séries de {reps}{load} — marcar como feito",
    "{name}, {sets} sets of {reps}{load} — mark as done",
    "{name}, {sets} series de {reps}{load} — marcar como hecho",
  ],
  chkRowDone: [
    "{name} — feito, toque para desmarcar",
    "{name} — done, tap to undo",
    "{name} — hecho, toca para desmarcar",
  ],
  chkRowNext: ["próximo exercício", "next exercise", "próximo ejercicio"],
  chkLive: [
    "{done} de {total} exercícios concluídos",
    "{done} of {total} exercises done",
    "{done} de {total} ejercicios completados",
  ],
  chkDoneStamp: ["Treino concluído", "Workout done", "Entreno completado"],
  chkDoneAt: ["Treino concluído · {time}", "Workout done · {time}", "Entreno completado · {time}"],
  chkEmptyPlan: ["Esta ficha está sem exercícios", "This plan has no exercises", "Esta ficha no tiene ejercicios"],
  chkSaveError: ["Não deu pra salvar o check", "Couldn't save the check", "No se pudo guardar el check"],
  chkBack: ["Voltar", "Back", "Volver"],
  chkNoPlanTitle: ["Nenhuma ficha ativa", "No active plan", "Ninguna ficha activa"],
  chkBuildPlan: ["Montar minha ficha", "Build my plan", "Armar mi ficha"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.Fitness = json.Fitness || {}
  for (const [key, vals] of Object.entries(FITNESS)) {
    if (json.Fitness[key] === undefined) {
      json.Fitness[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n esportes checklist: ${added} chaves adicionadas`)
