// Gerenciamento da conta (/account/gerenciamento): merge de chaves novas no
// namespace "Account" em messages/{pt-BR,en,es}.json. Idempotente e
// não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
//
// Rodar: node scripts/i18n-account-gerenciamento-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  mgmtButton: ["Gerenciar", "Manage", "Gestionar"],
  mgmtButtonAria: [
    "Gerenciamento da conta: subperfis, serviços, cursos e produtos",
    "Account management: subprofiles, services, courses and products",
    "Gestión de la cuenta: subperfiles, servicios, cursos y productos",
  ],
  mgmtHeading: ["Gerenciamento da conta", "Account management", "Gestión de la cuenta"],
  mgmtSubheading: [
    "Tudo que você possui em um lugar só: entre pra editar ou exclua direto da lista.",
    "Everything you own in one place: open to edit or delete right from the list.",
    "Todo lo que tienes en un solo lugar: entra para editar o elimina directo de la lista.",
  ],
  mgmtBackToAccount: ["Voltar pra conta", "Back to account", "Volver a la cuenta"],
  mgmtLoadError: ["Erro ao carregar gerenciamento", "Failed to load management", "Error al cargar la gestión"],
  mgmtEditLoadError: ["Erro ao abrir edição", "Failed to open editor", "Error al abrir la edición"],
  mgmtRetry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  mgmtProfilesTitle: ["Subperfis", "Subprofiles", "Subperfiles"],
  mgmtServicesTitle: ["Serviços", "Services", "Servicios"],
  mgmtCoursesTitle: ["Cursos", "Courses", "Cursos"],
  mgmtProductsTitle: ["Produtos", "Products", "Productos"],
  mgmtProfilesEmpty: ["Nenhum subperfil ainda.", "No subprofiles yet.", "Aún no hay subperfiles."],
  mgmtServicesEmpty: ["Nenhum serviço cadastrado.", "No services registered.", "Ningún servicio registrado."],
  mgmtCoursesEmpty: ["Nenhum curso criado.", "No courses created.", "Ningún curso creado."],
  mgmtProductsEmpty: ["Nenhum produto à venda.", "No products for sale.", "Ningún producto a la venta."],
  mgmtProfileWord: ["Subperfil", "Subprofile", "Subperfil"],
  mgmtBadgeActive: ["Ativo", "Active", "Activo"],
  mgmtBadgeInactive: ["Inativo", "Inactive", "Inactivo"],
  mgmtBadgeUnpaid: ["Não ativado", "Not activated", "No activado"],
  mgmtBadgePublished: ["Publicado", "Published", "Publicado"],
  mgmtBadgeDraft: ["Rascunho", "Draft", "Borrador"],
  mgmtEdit: ["Editar", "Edit", "Editar"],
  mgmtDeleteAria: ["Excluir item", "Delete item", "Eliminar elemento"],
  mgmtDeleteTitle: ["Excluir?", "Delete?", "¿Eliminar?"],
  mgmtDeleteDesc: [
    "“{name}” será removido. Essa ação não pode ser desfeita por aqui.",
    "“{name}” will be removed. This action can't be undone from here.",
    "“{name}” será eliminado. Esta acción no se puede deshacer desde aquí.",
  ],
  mgmtDeleteProfileWarn: [
    "Excluir um subperfil tira ele da vitrine e leva junto o que está vinculado a ele.",
    "Deleting a subprofile removes it from the showcase along with everything linked to it.",
    "Eliminar un subperfil lo quita de la vitrina junto con todo lo vinculado a él.",
  ],
  mgmtCancel: ["Cancelar", "Cancel", "Cancelar"],
  mgmtDeleteConfirm: ["Excluir definitivamente", "Delete permanently", "Eliminar definitivamente"],
  mgmtDeleted: ["Excluído com sucesso", "Deleted successfully", "Eliminado con éxito"],
  mgmtDeleteError: ["Erro ao excluir", "Failed to delete", "Error al eliminar"],
}

const GROUPS = { Account: ACCOUNT }

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
