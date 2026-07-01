// Namespaces Profile/Account — cursos agora nascem dentro do subperfil (pago)
// e o nível do user vira "Meu aprendizado". Idempotente, fill-if-absent. Rodar:
//   node scripts/i18n-courses-subprofile-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const PROFILE = {
  newCourseInline: ["Novo curso", "New course", "Nuevo curso"],
  createCourseNeedsPaid: [
    "Ative este perfil para criar cursos.",
    "Activate this profile to create courses.",
    "Activa este perfil para crear cursos.",
  ],
  noCoursesOwnerHintPaid: [
    "Crie um curso para mostrá-lo aqui.",
    "Create a course to show it here.",
    "Crea un curso para mostrarlo aquí.",
  ],
  activateProfile: ["Ativar perfil", "Activate profile", "Activar perfil"],
}

const ACCOUNT = {
  myLearning: ["Meu aprendizado", "My learning", "Mi aprendizaje"],
}

const GROUPS = { Profile: PROFILE, Account: ACCOUNT }

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
