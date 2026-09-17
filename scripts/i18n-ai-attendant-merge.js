/**
 * i18n do ATENDENTE COM IA (mig 253) — a tela da base de conhecimento do dono.
 *
 * Namespace novo `AiAttendant` (a tela do ADMIN não entra: painel interno é
 * pt-only, regra da casa) + 2 chaves no ns `Account`, que são o rótulo da porta
 * na barra de ferramentas da conta.
 *
 * Fill-if-absent como todos os merges da casa: nunca sobrescreve o que já está
 * no dicionário. Idempotente — a 2ª passada não muda nada.
 *
 * ⚠️ `{n}` e `{m}` são substituídos por `.replace` no componente: o provider de
 * i18n da casa NÃO interpola.
 */
const fs = require("fs");
const path = require("path");

const DICTS = ["pt-BR", "en", "es"];

const ADD = {
  AiAttendant: {
    title: ["Atendente com IA", "AI attendant", "Asistente con IA"],
    intro: [
      "A plataforma responde pelo seu negócio usando o que já está cadastrado aqui (perfis, serviços, produtos, cursos e site). O que só você sabe — horário, garantia, tabela de preço, o que você não faz — entra abaixo.",
      "The platform answers for your business using what is already registered here (profiles, services, products, courses and site). What only you know — hours, warranty, price list, what you do not do — goes below.",
      "La plataforma responde por tu negocio con lo que ya está registrado aquí (perfiles, servicios, productos, cursos y sitio). Lo que solo tú sabes — horario, garantía, lista de precios, lo que no haces — va abajo.",
    ],
    loading: ["Carregando…", "Loading…", "Cargando…"],
    loadFail: ["Não consegui carregar.", "Could not load.", "No pude cargar."],
    saveFail: ["Não consegui salvar.", "Could not save.", "No pude guardar."],
    deleteFail: ["Não consegui apagar.", "Could not delete.", "No pude borrar."],
    docsTitle: ["Base de conhecimento", "Knowledge base", "Base de conocimiento"],
    // Os DOIS números: total guardado × o que a IA realmente lê.
    docsCount: [
      "{n} documentos · a IA lê {m}",
      "{n} documents · the AI reads {m}",
      "{n} documentos · la IA lee {m}",
    ],
    docsEmpty: [
      "Nada aqui ainda. O atendente já responde com o que está cadastrado na sua conta — o que você escrever abaixo entra junto.",
      "Nothing here yet. The attendant already answers with what is registered in your account — whatever you write below goes along with it.",
      "Nada aquí todavía. El asistente ya responde con lo que está registrado en tu cuenta — lo que escribas abajo se suma a eso.",
    ],
    chars: ["{n} caracteres", "{n} characters", "{n} caracteres"],
    active: ["A IA lê", "AI reads it", "La IA lo lee"],
    delete: ["Apagar", "Delete", "Borrar"],
    deleteConfirm: [
      "Apagar este documento? Não dá para desfazer.",
      "Delete this document? This cannot be undone.",
      "¿Borrar este documento? No se puede deshacer.",
    ],
    limitReached: [
      "Você chegou ao limite de documentos. Apague algum para acrescentar outro.",
      "You reached the document limit. Delete one to add another.",
      "Llegaste al límite de documentos. Borra alguno para agregar otro.",
    ],
    newText: ["Escrever um documento", "Write a document", "Escribir un documento"],
    titlePlaceholder: [
      "Título (ex.: Horário e formas de pagamento)",
      "Title (e.g. Hours and payment methods)",
      "Título (ej.: Horario y formas de pago)",
    ],
    contentPlaceholder: [
      "Escreva como você explicaria a um cliente no balcão.",
      "Write it the way you would explain it to a customer at the counter.",
      "Escríbelo como se lo explicarías a un cliente en el mostrador.",
    ],
    add: ["Acrescentar", "Add", "Agregar"],
    newPdf: ["Mandar um PDF", "Send a PDF", "Enviar un PDF"],
    pdfHint: [
      "Tabela de preço, catálogo, manual. A plataforma guarda o TEXTO do arquivo, não o arquivo.",
      "Price list, catalogue, manual. The platform stores the TEXT of the file, not the file.",
      "Lista de precios, catálogo, manual. La plataforma guarda el TEXTO del archivo, no el archivo.",
    ],
    choosePdf: ["Escolher PDF", "Choose PDF", "Elegir PDF"],
    pdfFail: [
      "Não consegui ler este PDF.",
      "Could not read this PDF.",
      "No pude leer este PDF.",
    ],
    // Dito em voz alta: sem isso o dono acha que a IA leu o manual inteiro.
    pdfTruncated: [
      "O PDF era grande e só uma parte dele entrou. Confira na prévia o que a IA está lendo.",
      "The PDF was large and only part of it was stored. Check the preview to see what the AI reads.",
      "El PDF era grande y solo entró una parte. Revisa la vista previa para ver lo que la IA lee.",
    ],
    previewTitle: ["O que a IA lê", "What the AI reads", "Lo que la IA lee"],
    preview: ["Ver a prévia", "See the preview", "Ver la vista previa"],
    previewHint: [
      "É exatamente o texto que vai junto de cada resposta. Se algo estiver errado aqui, o atendente vai repetir o erro.",
      "This is exactly the text sent with every answer. If something is wrong here, the attendant will repeat the mistake.",
      "Es exactamente el texto que va con cada respuesta. Si algo está mal aquí, el asistente repetirá el error.",
    ],
  },
  Account: {
    aiAttendant: ["Atendente com IA", "AI attendant", "Asistente con IA"],
    aiAttendantAria: [
      "Atendente com IA: o que a plataforma deve saber para responder por você",
      "AI attendant: what the platform should know to answer for you",
      "Asistente con IA: lo que la plataforma debe saber para responder por ti",
    ],
  },
};

let added = 0;

DICTS.forEach((locale, i) => {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [ns, keys] of Object.entries(ADD)) {
    dict[ns] = dict[ns] || {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(`i18n atendente com IA: ${added} chave(s) adicionada(s).`);
