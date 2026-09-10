/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do menu da foto de perfil e das modalidades
// novas de comunidade (pet e carro — mig 210).
//
// ⚠️ AS CHAVES DE GAMES SAÍRAM DAQUI (2026-09-09), junto com o frontend daquele
// ambiente. Elas foram apagadas dos três dicionários, e este merge é
// fill-if-absent: deixá-las na tabela faria a próxima execução RESSUSCITAR o
// que a limpeza tirou.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-spaces-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const SPACES = {
  // ── menu ────────────────────────────────────────────────────────────────
  newProfile: ["Novo perfil", "New profile", "Nuevo perfil"],
  myPet: ["Meu pet", "My pet", "Mi mascota"],
  myCar: ["Meu carro", "My car", "Mi coche"],
  myAcademy: ["Minha academia", "My gym", "Mi gimnasio"],
  myCondo: ["Meu condomínio", "My building", "Mi condominio"],
  myStreet: ["Minha rua", "My street", "Mi calle"],
  myCommunity: ["Minha comunidade", "My community", "Mi comunidad"],
  viewBees: ["Ver seus bees", "View your bees", "Ver tus bees"],
  loading: ["Carregando...", "Loading...", "Cargando..."],
  creating: ["Criando...", "Creating...", "Creando..."],
  opening: ["Abrindo...", "Opening...", "Abriendo..."],
  createError: [
    "Não foi possível criar.",
    "Could not create it.",
    "No fue posible crear.",
  ],

  // ── ações de "não tenho nenhum ainda" ───────────────────────────────────
  newPet: ["Novo pet", "New pet", "Nueva mascota"],
  newCar: ["Adicionar carro", "Add car", "Añadir coche"],
  newCondo: ["Cadastrar condomínio", "Register building", "Registrar condominio"],
  newCommunity: ["Criar comunidade", "Create community", "Crear comunidad"],
  findAcademy: ["Encontrar academia", "Find a gym", "Encontrar gimnasio"],
  findStreet: ["Encontrar meu bairro", "Find my neighborhood", "Encontrar mi barrio"],
  academyOwner: ["Você é dono", "You own it", "Eres dueño"],
  academyMember: ["Aluno", "Member", "Alumno"],

  // ── pet ─────────────────────────────────────────────────────────────────
  newPetTitle: ["Novo pet", "New pet", "Nueva mascota"],
  newPetDesc: [
    "O pet ganha uma comunidade própria, com mural, seguidores e posts.",
    "Your pet gets its own community, with a wall, followers and posts.",
    "Tu mascota gana una comunidad propia, con muro, seguidores y publicaciones.",
  ],
  petNameLabel: ["Nome do pet", "Pet name", "Nombre de la mascota"],
  petNamePlaceholder: ["Ex.: Rex", "E.g.: Rex", "Ej.: Rex"],
  petNameRequired: ["Dê um nome ao seu pet.", "Name your pet.", "Ponle un nombre a tu mascota."],
  speciesLabel: ["O que ele é", "What it is", "Qué es"],
  speciesDog: ["Cachorro", "Dog", "Perro"],
  speciesCat: ["Gato", "Cat", "Gato"],
  speciesOther: ["Outro animal", "Other animal", "Otro animal"],
  breedLabel: ["Raça", "Breed", "Raza"],
  breedUnknown: [
    "Não sei / não informar",
    "I don't know / skip",
    "No sé / no informar",
  ],
  breedFreeLabel: ["Qual raça?", "Which breed?", "¿Qué raza?"],
  birthYearLabel: [
    "Ano de nascimento (opcional)",
    "Year of birth (optional)",
    "Año de nacimiento (opcional)",
  ],
  createPetCta: [
    "Criar comunidade do pet",
    "Create pet community",
    "Crear comunidad de la mascota",
  ],

  // ── carro ───────────────────────────────────────────────────────────────
  newCarTitle: ["Meu carro", "My car", "Mi coche"],
  newCarDesc: [
    "Existe uma única comunidade por modelo. Se alguém já tiver criado a do seu carro, você entra na dela.",
    "There is a single community per model. If someone already created yours, you join theirs.",
    "Existe una única comunidad por modelo. Si alguien ya creó la de tu coche, entras en la suya.",
  ],
  carBrandLabel: ["Marca", "Brand", "Marca"],
  carModelLabel: ["Modelo", "Model", "Modelo"],
  carPickBrandFirst: ["Escolha a marca", "Pick the brand first", "Elige la marca"],
  carPickBoth: [
    "Escolha a marca e o modelo.",
    "Pick the brand and the model.",
    "Elige la marca y el modelo.",
  ],
  carFipeOffline: [
    "A tabela FIPE não respondeu agora. Você pode digitar marca e modelo.",
    "The FIPE catalog did not respond. You can type the brand and model.",
    "La tabla FIPE no respondió. Puedes escribir marca y modelo.",
  ],
  createCarCta: [
    "Abrir comunidade do carro",
    "Open car community",
    "Abrir comunidad del coche",
  ],

  communityNameOptional: [
    "Nome da comunidade (opcional)",
    "Community name (optional)",
    "Nombre de la comunidad (opcional)",
  ],

  // ── comum aos modais ────────────────────────────────────────────────────
  bioLabel: ["Descrição (opcional)", "Description (optional)", "Descripción (opcional)"],
};

// Chips das modalidades novas na vitrine, no card e no cabeçalho da comunidade
// + o editor do ASSUNTO, que mora no modo de edição da própria comunidade.
//
// Nota: as chaves de modal do ns `Spaces` (newPetTitle, createCarCta, etc.)
// ficaram ÓRFÃS de propósito quando os modais de cadastro morreram — a criação
// virou "cria vazio e edita dentro". Elas não atrapalham e evitam retrabalho se
// algum fluxo voltar a precisar de um formulário fora da página.
const COMMUNITY = {
  kindPet: ["Pet", "Pet", "Mascota"],
  kindCar: ["Carro", "Car", "Coche"],

  subjectPetTitle: ["Sobre o pet", "About the pet", "Sobre la mascota"],
  subjectCarTitle: ["O carro", "The car", "El coche"],
  speciesDog: ["Cachorro", "Dog", "Perro"],
  speciesCat: ["Gato", "Cat", "Gato"],
  speciesOther: ["Outro animal", "Other animal", "Otro animal"],
  breedLabel: ["Raça", "Breed", "Raza"],
  breedUnknown: ["Não sei / não informar", "I don't know / skip", "No sé / no informar"],
  birthYearLabel: ["Ano de nascimento", "Year of birth", "Año de nacimiento"],
  carUniqueHint: [
    "Existe uma única comunidade por modelo. Se o modelo já tiver dono, o site avisa e leva você até ela.",
    "There is a single community per model. If the model is taken, we point you to it.",
    "Existe una única comunidad por modelo. Si el modelo ya tiene dueño, te llevamos a ella.",
  ],
  carBrandLabel: ["Marca", "Brand", "Marca"],
  carModelLabel: ["Modelo", "Model", "Modelo"],
  carPickBrandFirst: ["Escolha a marca", "Pick the brand first", "Elige la marca"],
};

// O rótulo do avatar na /account, que deixou de ser "trocar foto".
const ACCOUNT = {
  openSpaces: ["Meus espaços", "My spaces", "Mis espacios"],
};

const NAMESPACES = { Spaces: SPACES, Community: COMMUNITY, Account: ACCOUNT };

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
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added}`);
