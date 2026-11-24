/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves de MINHA CIDADE (2026-11-24): o ambiente
// /minha-cidade (ns `City`), o pill/linha "Minha cidade" do menu da foto
// (`Spaces.myCity`) e o estado de "não deu para ler" da tela do bairro
// (`Neighborhood`).
//
// Uso: node scripts/i18n-minha-cidade-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const CITY = {
  title: ["Minha cidade", "My city", "Mi ciudad"],
  tabsAria: ["Seções de Minha cidade", "My city sections", "Secciones de Mi ciudad"],
  tabHood: ["Meu bairro", "My neighborhood", "Mi barrio"],
  tabCondo: ["Meu condomínio", "My condo", "Mi condominio"],
  chipsAria: ["Qual comunidade abrir", "Which community to open", "Qué comunidad abrir"],
  livesInHouse: ["Moro em casa", "I live in a house", "Vivo en una casa"],
  livesInCondo: ["Moro em condomínio", "I live in a condo", "Vivo en un condominio"],
  chooseHousing: ["Escolher moradia", "Choose where you live", "Elegir vivienda"],
  switchCta: ["Trocar", "Change", "Cambiar"],
  switchNote: [
    "Trocar só muda a aba que abre primeiro. Sua residência, seu condomínio e seus pedidos continuam onde estão.",
    "Changing only sets which tab opens first. Your residence, your condo and your orders stay where they are.",
    "Cambiar solo define qué pestaña abre primero. Tu residencia, tu condominio y tus pedidos siguen donde están.",
  ],
  pickTitle: ["Onde você mora?", "Where do you live?", "¿Dónde vives?"],
  pickSubtitle: [
    "Escolha uma vez. Dá para trocar depois sem perder nada.",
    "Choose once. You can change it later without losing anything.",
    "Elige una vez. Puedes cambiarlo después sin perder nada.",
  ],
  houseTitle: ["Moro em casa", "I live in a house", "Vivo en una casa"],
  houseDesc: [
    "Informe sua rua e número. Você entra no seu bairro: vizinhos, mural, vitrine, delivery e ajuda com mudança.",
    "Enter your street and number. You join your neighborhood: neighbors, wall, showcase, delivery and moving help.",
    "Indica tu calle y número. Entras en tu barrio: vecinos, muro, vitrina, delivery y ayuda con mudanzas.",
  ],
  condoTitle: ["Moro em condomínio", "I live in a condo", "Vivo en un condominio"],
  condoDesc: [
    "Encontre ou cadastre seu condomínio e escolha seu apartamento. Avisos, enquetes, vagas, vitrine e delivery do prédio.",
    "Find or register your condo and pick your apartment. Notices, polls, parking, showcase and delivery for the building.",
    "Encuentra o registra tu condominio y elige tu apartamento. Avisos, encuestas, plazas, vitrina y delivery del edificio.",
  ],
  myResidence: ["Minha residência e vizinhos", "My residence and neighbors", "Mi residencia y vecinos"],
  needsAttention: ["pendente", "pending", "pendiente"],
  previewNote: [
    "Você está vendo um condomínio da busca. Para entrar, escolha seu apartamento na planta.",
    "You're viewing a condo from search. To join, pick your apartment on the floor plan.",
    "Estás viendo un condominio de la búsqueda. Para entrar, elige tu apartamento en el plano.",
  ],
  backToSearch: ["Voltar à busca", "Back to search", "Volver a la búsqueda"],
  findCondoTitle: ["Encontre seu condomínio", "Find your condo", "Encuentra tu condominio"],
  findCondoHelp: [
    "Busque pelo nome do condomínio, pelo bairro ou pela cidade.",
    "Search by condo name, neighborhood or city.",
    "Busca por el nombre del condominio, el barrio o la ciudad.",
  ],
  findCondoLabel: [
    "Nome, bairro ou cidade do condomínio",
    "Condo name, neighborhood or city",
    "Nombre, barrio o ciudad del condominio",
  ],
  findCondoPlaceholder: ["Ex.: Residencial Jardins", "E.g.: Residencial Jardins", "Ej.: Residencial Jardins"],
  findCondoError: [
    "A busca falhou. Confira a conexão e tente de novo.",
    "Search failed. Check your connection and try again.",
    "La búsqueda falló. Revisa la conexión e inténtalo de nuevo.",
  ],
  findCondoEmpty: [
    "Nenhum condomínio com esse nome ainda.",
    "No condo with that name yet.",
    "Aún no hay ningún condominio con ese nombre.",
  ],
  noCondoTitle: ["Seu condomínio não está aqui?", "Your condo isn't here?", "¿Tu condominio no está aquí?"],
  noCondoBody: [
    "Cadastre o prédio: nome e endereço. Bairro e cidade aparecem na busca; rua e número só para moradores confirmados.",
    "Register the building: name and address. Neighborhood and city show in search; street and number only to confirmed residents.",
    "Registra el edificio: nombre y dirección. Barrio y ciudad aparecen en la búsqueda; calle y número solo para residentes confirmados.",
  ],
  createCondoCta: ["Cadastrar meu condomínio", "Register my condo", "Registrar mi condominio"],
  saveError: [
    "Não deu para salvar agora. Tente de novo.",
    "Couldn't save right now. Try again.",
    "No se pudo guardar ahora. Inténtalo de nuevo.",
  ],
  anonTitle: ["Entre na sua conta", "Sign in to your account", "Entra en tu cuenta"],
  anonBody: [
    "Minha cidade reúne seu bairro e seu condomínio. Entre para ver os seus.",
    "My city brings together your neighborhood and your condo. Sign in to see yours.",
    "Mi ciudad reúne tu barrio y tu condominio. Entra para ver los tuyos.",
  ],
  loginCta: ["Entrar", "Sign in", "Entrar"],
  loadErrorTitle: [
    "Não deu para abrir Minha cidade agora.",
    "Couldn't open My city right now.",
    "No se pudo abrir Mi ciudad ahora.",
  ],
  loadErrorBody: [
    "Seu bairro e seu condomínio continuam guardados. Confira a conexão e tente de novo.",
    "Your neighborhood and condo are still saved. Check your connection and try again.",
    "Tu barrio y tu condominio siguen guardados. Revisa la conexión e inténtalo de nuevo.",
  ],
  retryCta: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  disabledTitle: ["Recurso indisponível no momento.", "Feature unavailable right now.", "Función no disponible por ahora."],
};

const SPACES = {
  myCity: ["Minha cidade", "My city", "Mi ciudad"],
};

const NEIGHBORHOOD = {
  loadFailedTitle: [
    "Não deu para ler seus vínculos agora.",
    "Couldn't load your links right now.",
    "No se pudieron leer tus vínculos ahora.",
  ],
  loadFailedBody: [
    "Nada foi perdido. Confira a conexão e tente de novo.",
    "Nothing was lost. Check your connection and try again.",
    "No se perdió nada. Revisa la conexión e inténtalo de nuevo.",
  ],
  retryCta: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  cepChecking: ["Conferindo o CEP…", "Checking the ZIP code…", "Verificando el código postal…"],
  cepNeighborhood: ["bairro", "neighborhood", "barrio"],
  cepNotFound: ["CEP não encontrado. Confira os números.", "ZIP code not found. Check the digits.", "Código postal no encontrado. Revisa los números."],
  cepUnavailable: [
    "Não deu para conferir o CEP agora. Você pode declarar mesmo assim; o bairro é confirmado depois.",
    "Couldn't check the ZIP code right now. You can still declare; the neighborhood is confirmed later.",
    "No se pudo verificar el código postal ahora. Puedes declarar igual; el barrio se confirma después.",
  ],
};

const NAMESPACES = { City: CITY, Spaces: SPACES, Neighborhood: NEIGHBORHOOD };

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`[i18n] ${locale} atualizado`);
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
