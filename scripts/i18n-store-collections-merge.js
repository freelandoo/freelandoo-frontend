// Coleções da Loja (mig 271): a barra de coleções e os campos de coleção e
// destaque no cadastro do produto. Idempotente, fill-if-absent.
//   node scripts/i18n-store-collections-merge.js
const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", "messages")

const NS = {
  Account: {
    collectionsTitle: ["Coleções", "Collections", "Colecciones"],
    collectionNew: ["Nova coleção", "New collection", "Nueva colección"],
    collectionsFilterAria: [
      "Filtrar produtos por coleção",
      "Filter products by collection",
      "Filtrar productos por colección",
    ],
    collectionAll: ["Todas", "All", "Todas"],
    collectionNone: ["Sem coleção", "No collection", "Sin colección"],
    collectionEditAria: ["Editar a coleção", "Edit collection", "Editar la colección"],
    collectionHint: [
      "A coleção agrupa os produtos na vitrine e vira uma página no seu site.",
      "A collection groups products in your storefront and becomes a page on your site.",
      "La colección agrupa los productos en la vitrina y se convierte en una página de tu sitio.",
    ],
    collectionDelete: ["Apagar coleção", "Delete collection", "Eliminar colección"],
    collectionName: ["Nome", "Name", "Nombre"],
    collectionNamePh: ["New Drop", "New Drop", "New Drop"],
    collectionKicker: ["Frase curta", "Short line", "Frase corta"],
    collectionKickerPh: ["Drop 001", "Drop 001", "Drop 001"],
    collectionDescription: ["Descrição", "Description", "Descripción"],
    collectionSlug: ["Endereço da página", "Page address", "Dirección de la página"],
    collectionSlugHint: [
      "Mudar o endereço quebra os links que já foram compartilhados. Renomear a coleção não muda o endereço.",
      "Changing the address breaks links that were already shared. Renaming the collection does not change it.",
      "Cambiar la dirección rompe los enlaces ya compartidos. Renombrar la colección no la cambia.",
    ],
    collectionCover: ["Capa", "Cover", "Portada"],
    collectionCoverChange: ["Trocar capa", "Change cover", "Cambiar portada"],
    collectionCoverAdd: ["Enviar capa", "Upload cover", "Subir portada"],
    collectionCoverRemove: ["Tirar a capa", "Remove cover", "Quitar la portada"],
    collectionCoverAfter: [
      "Depois de criar, você pode enviar a capa da coleção.",
      "After creating it, you can upload the collection cover.",
      "Después de crearla, puedes subir la portada de la colección.",
    ],
    collectionNameRequired: ["Dê um nome para a coleção.", "Give the collection a name.", "Ponle un nombre a la colección."],
    collectionSaveError: [
      "Não foi possível salvar a coleção.",
      "Could not save the collection.",
      "No se pudo guardar la colección.",
    ],
    collectionDeleteConfirm: [
      "Apagar esta coleção? Os produtos dela continuam na loja, só ficam sem coleção.",
      "Delete this collection? Its products stay in the store, just without a collection.",
      "¿Eliminar esta colección? Sus productos siguen en la tienda, solo quedan sin colección.",
    ],
    collectionDeleteError: [
      "Não foi possível apagar a coleção.",
      "Could not delete the collection.",
      "No se pudo eliminar la colección.",
    ],
    collectionCoverError: ["Não foi possível enviar a capa.", "Could not upload the cover.", "No se pudo subir la portada."],
    featuredBadge: ["Destaque", "Featured", "Destacado"],
    productCollection: ["Coleção", "Collection", "Colección"],
    productFeatured: [
      "Destaque (aparece primeiro no site)",
      "Featured (shown first on your site)",
      "Destacado (aparece primero en el sitio)",
    ],
  },
  Payments: {
    buyerWhatsapp: ["WhatsApp da compradora", "Buyer's WhatsApp", "WhatsApp de la compradora"],
    orderNote: ["Recado do pedido:", "Order note:", "Nota del pedido:"],
  },
}

function load(f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }
function save(f, o) { fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + "\n", "utf8") }
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(NS)) {
    if (!d[ns]) d[ns] = {}
    for (const [k, vals] of Object.entries(keys)) if (!(k in d[ns])) { d[ns][k] = vals[idx]; added++ }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
