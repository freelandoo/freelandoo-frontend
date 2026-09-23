/**
 * i18n da PROSPECÇÃO (mig 254) e do merge dos pills da comunidade.
 *
 * Dois namespaces:
 *   · `Leads`     — a tela nova (ns próprio: é um produto, não um detalhe da
 *                   comunidade), incluindo os rótulos das 31 categorias, dos
 *                   estágios de CRM e dos nomes de campo/fonte da ficha.
 *   · `Community` — o pill único ("Comunidade"), o pill "Leads" e a aba
 *                   "Números" do painel.
 *
 * Fill-if-absent como todos os merges da casa — NUNCA sobrescreve o que já
 * está no dicionário. Idempotente: a 2ª passada não muda nada.
 *
 * ⚠️ AS CHAVES DOS PILLS ANTIGOS (`profilePill`, `muralPill`, `rankingPill`)
 * FICAM ÓRFÃS DE PROPÓSITO, padrão da casa — e duas delas continuam VIVAS como
 * rótulo de ABA dentro do painel (`profilePill` e `muralPill`). Apagá-las
 * deixaria as abas em branco.
 */
const fs = require("fs");
const path = require("path");

const DICTS = ["pt-BR", "en", "es"];

/** As 31 categorias do catálogo fechado (backend: utils/companyCategories.js). */
const CATEGORIES = {
  cat_academia: ["Academias", "Gyms", "Gimnasios"],
  cat_restaurante: ["Restaurantes", "Restaurants", "Restaurantes"],
  cat_bar: ["Bares e lanchonetes", "Bars and snack bars", "Bares y cafeterías"],
  cat_padaria: ["Padarias e confeitarias", "Bakeries", "Panaderías"],
  cat_cafeteria: ["Cafeterias", "Coffee shops", "Cafeterías"],
  cat_mercado: ["Mercados e mercearias", "Grocery stores", "Supermercados"],
  cat_barbearia: ["Barbearias", "Barbershops", "Barberías"],
  cat_salao_beleza: ["Salões de beleza e estética", "Beauty salons", "Salones de belleza"],
  cat_dentista: ["Dentistas", "Dentists", "Dentistas"],
  cat_clinica: ["Clínicas e consultórios", "Clinics", "Clínicas"],
  cat_veterinario: ["Veterinários", "Veterinarians", "Veterinarios"],
  cat_pet_shop: ["Pet shops", "Pet shops", "Tiendas de mascotas"],
  cat_farmacia: ["Farmácias", "Pharmacies", "Farmacias"],
  cat_imobiliaria: ["Imobiliárias", "Real estate agencies", "Inmobiliarias"],
  cat_advogado: ["Advogados", "Law firms", "Abogados"],
  cat_contador: ["Contabilidade", "Accountants", "Contabilidad"],
  cat_oficina_mecanica: ["Oficinas mecânicas", "Auto repair shops", "Talleres mecánicos"],
  cat_concessionaria: ["Concessionárias e revendas", "Car dealerships", "Concesionarios"],
  cat_autoescola: ["Autoescolas", "Driving schools", "Autoescuelas"],
  cat_escola: ["Escolas e cursos", "Schools and courses", "Escuelas y cursos"],
  cat_hotel: ["Hotéis e pousadas", "Hotels and inns", "Hoteles y posadas"],
  cat_loja_roupa: ["Lojas de roupa e calçados", "Clothing and shoe stores", "Tiendas de ropa y calzado"],
  cat_otica: ["Óticas", "Optical shops", "Ópticas"],
  cat_material_construcao: ["Material de construção", "Building supplies", "Materiales de construcción"],
  cat_movelaria: ["Móveis e marcenaria", "Furniture and carpentry", "Muebles y carpintería"],
  cat_eletricista: ["Elétrica e hidráulica", "Electrical and plumbing", "Electricidad y fontanería"],
  cat_energia_solar: ["Energia solar", "Solar energy", "Energía solar"],
  cat_grafica: ["Gráficas e comunicação visual", "Print shops and signage", "Imprentas y rotulación"],
  cat_floricultura: ["Floriculturas", "Florists", "Floristerías"],
  cat_lavanderia: ["Lavanderias", "Laundries", "Lavanderías"],
  cat_agencia_marketing: ["Agências e marketing", "Agencies and marketing", "Agencias y marketing"],
};

const LEADS = {
  title: ["Encontre clientes", "Find customers", "Encuentra clientes"],
  subtitle: [
    "Empresas brasileiras por categoria e cidade, com os canais de contato de cada uma.",
    "Brazilian companies by category and city, with each one's contact channels.",
    "Empresas brasileñas por categoría y ciudad, con los canales de contacto de cada una.",
  ],
  loadError: [
    "Não deu para abrir a prospecção agora.",
    "We couldn't open prospecting right now.",
    "No se pudo abrir la prospección ahora.",
  ],
  searchError: ["Não deu para buscar agora.", "We couldn't search right now.", "No se pudo buscar ahora."],
  category: ["O que você procura", "What you're looking for", "Qué buscas"],
  anyCategory: ["Qualquer categoria", "Any category", "Cualquier categoría"],
  uf: ["Estado", "State", "Estado"],
  city: ["Cidade", "City", "Ciudad"],
  cityPlaceholder: ["São Bernardo do Campo", "São Bernardo do Campo", "São Bernardo do Campo"],
  term: ["Nome (opcional)", "Name (optional)", "Nombre (opcional)"],
  termPlaceholder: ["parte do nome", "part of the name", "parte del nombre"],
  search: ["Buscar", "Search", "Buscar"],
  minCapital: [
    "Capital social mínimo (R$)",
    "Minimum share capital (R$)",
    "Capital social mínimo (R$)",
  ],
  minYears: ["Aberta há mais de (anos)", "Open for more than (years)", "Abierta hace más de (años)"],

  fWhats: ["Com WhatsApp", "With WhatsApp", "Con WhatsApp"],
  fPhone: ["Com telefone", "With phone", "Con teléfono"],
  fEmail: ["Com e-mail", "With email", "Con correo"],
  fSite: ["Com site", "With website", "Con sitio web"],
  fInsta: ["Com Instagram", "With Instagram", "Con Instagram"],
  fCnpj: ["Com CNPJ", "With tax ID", "Con CNPJ"],
  fActive: ["Empresa ativa", "Active company", "Empresa activa"],
  fHq: ["Só matriz", "Headquarters only", "Solo matriz"],

  discover: ["Procurar mais", "Search for more", "Buscar más"],
  discoverHint: [
    "Procura estabelecimentos novos no OpenStreetMap",
    "Looks for new businesses on OpenStreetMap",
    "Busca establecimientos nuevos en OpenStreetMap",
  ],
  discoverNeeds: [
    "Escolha a categoria, o estado e a cidade.",
    "Pick the category, the state and the city.",
    "Elige la categoría, el estado y la ciudad.",
  ],
  discoverQueued: [
    "Estamos procurando. Isso leva alguns minutos.",
    "We're searching. This takes a few minutes.",
    "Estamos buscando. Esto tarda unos minutos.",
  ],
  discoverFresh: [
    "Esta busca já foi feita há pouco — a lista está atual.",
    "This search ran recently — the list is up to date.",
    "Esta búsqueda se hizo hace poco — la lista está actualizada.",
  ],
  discoverError: [
    "Não deu para pedir a busca agora.",
    "We couldn't request the search right now.",
    "No se pudo pedir la búsqueda ahora.",
  ],

  enrich: ["Buscar mais dados", "Find more data", "Buscar más datos"],
  enrichHint: [
    "Procura e-mail, WhatsApp e redes no site oficial e o CNPJ na Receita",
    "Looks for email, WhatsApp and socials on the official site, plus the tax registry",
    "Busca correo, WhatsApp y redes en el sitio oficial y el registro fiscal",
  ],
  enrichQueued: [
    "Buscando mais dados desta empresa.",
    "Looking for more data on this company.",
    "Buscando más datos de esta empresa.",
  ],
  enrichFresh: [
    "Os dados desta empresa já estão atualizados.",
    "This company's data is already up to date.",
    "Los datos de esta empresa ya están actualizados.",
  ],
  enrichError: [
    "Não deu para enriquecer agora.",
    "We couldn't enrich it right now.",
    "No se pudo enriquecer ahora.",
  ],

  working: ["Procurando agora", "Searching now", "Buscando ahora"],
  workingEnrich: [
    "Buscando dados de uma empresa",
    "Looking up a company's data",
    "Buscando datos de una empresa",
  ],
  workingHint: [
    "A lista se atualiza sozinha quando terminar.",
    "The list refreshes on its own when it's done.",
    "La lista se actualiza sola cuando termine.",
  ],

  lists: ["Minhas listas", "My lists", "Mis listas"],
  newList: ["Nova lista", "New list", "Nueva lista"],
  createList: ["Criar lista", "Create list", "Crear lista"],
  deleteList: ["Apagar lista", "Delete list", "Eliminar lista"],
  listError: ["Não deu para criar a lista.", "We couldn't create the list.", "No se pudo crear la lista."],
  listExisted: [
    "Você já tinha uma lista com esse nome.",
    "You already had a list with that name.",
    "Ya tenías una lista con ese nombre.",
  ],
  listOpenError: ["Não deu para abrir a lista.", "We couldn't open the list.", "No se pudo abrir la lista."],
  noLists: ["Crie uma lista primeiro.", "Create a list first.", "Crea una lista primero."],
  save: ["Salvar", "Save", "Guardar"],
  savedShort: ["Salvo", "Saved", "Guardado"],
  saved: ["Salvo na lista.", "Saved to the list.", "Guardado en la lista."],
  saveError: ["Não deu para salvar o lead.", "We couldn't save the lead.", "No se pudo guardar el lead."],
  removeFromList: ["Tirar da lista", "Remove from list", "Quitar de la lista"],
  backToSearch: ["Voltar à busca", "Back to search", "Volver a la búsqueda"],
  export: ["Exportar CSV", "Export CSV", "Exportar CSV"],

  resultCount: ["{n} empresas", "{n} companies", "{n} empresas"],
  emptyTitle: ["Escolha o que procurar", "Pick what to look for", "Elige qué buscar"],
  emptyText: [
    "Diga a categoria e a cidade. O que já estiver na base aparece na hora; o que faltar, a gente procura.",
    "Tell us the category and the city. What's already in the base shows up instantly; the rest we go find.",
    "Dinos la categoría y la ciudad. Lo que ya está en la base aparece al instante; lo demás lo buscamos.",
  ],
  noResults: ["Nada por aqui ainda", "Nothing here yet", "Nada por aquí todavía"],
  noResultsDiscover: [
    "Aperte “Procurar mais” para varrer essa cidade.",
    "Hit “Search for more” to sweep that city.",
    "Pulsa “Buscar más” para recorrer esa ciudad.",
  ],
  noResultsOff: [
    "A busca por empresas novas está indisponível no momento.",
    "Searching for new companies is unavailable right now.",
    "La búsqueda de empresas nuevas no está disponible ahora.",
  ],
  thinHint: [
    "Poucos resultados? Aperte “Procurar mais” para varrer essa cidade.",
    "Few results? Hit “Search for more” to sweep that city.",
    "¿Pocos resultados? Pulsa “Buscar más” para recorrer esa ciudad.",
  ],
  prev: ["Anterior", "Previous", "Anterior"],
  next: ["Próxima", "Next", "Siguiente"],
  active: ["Ativa", "Active", "Activa"],
  confidenceHint: [
    "Quanto a plataforma já sabe sobre esta empresa",
    "How much the platform already knows about this company",
    "Cuánto sabe la plataforma sobre esta empresa",
  ],

  detail: ["Ficha completa", "Full profile", "Ficha completa"],
  detailError: ["Não deu para abrir a ficha.", "We couldn't open the profile.", "No se pudo abrir la ficha."],
  close: ["Fechar", "Close", "Cerrar"],
  dCnpj: ["CNPJ", "Tax ID (CNPJ)", "CNPJ"],
  dCnae: ["CNAE principal", "Main activity code", "CNAE principal"],
  dSize: ["Porte", "Size", "Tamaño"],
  dCapital: ["Capital social", "Share capital", "Capital social"],
  dOpened: ["Abertura", "Founded", "Apertura"],
  dStatus: ["Situação cadastral", "Registration status", "Situación registral"],
  dAddress: ["Endereço", "Address", "Dirección"],
  dZip: ["CEP", "ZIP code", "Código postal"],
  sources: ["De onde vieram os dados", "Where the data came from", "De dónde vienen los datos"],
  noSources: ["Sem registro de origem.", "No source on record.", "Sin registro de origen."],

  // Estágios do CRM (backend: chk_lead_item_stage).
  stage_new: ["Novo", "New", "Nuevo"],
  stage_contacted: ["Contatado", "Contacted", "Contactado"],
  stage_qualified: ["Qualificado", "Qualified", "Calificado"],
  stage_won: ["Fechado", "Won", "Ganado"],
  stage_lost: ["Perdido", "Lost", "Perdido"],

  // Porte e situação, como a Receita os normaliza.
  size_mei: ["MEI", "Sole proprietor (MEI)", "MEI"],
  size_me: ["Microempresa", "Micro business", "Microempresa"],
  size_epp: ["Pequeno porte", "Small business", "Pequeña empresa"],
  size_demais: ["Demais", "Other", "Otras"],
  status_ativa: ["Ativa", "Active", "Activa"],
  status_baixada: ["Baixada", "Closed", "Dada de baja"],
  status_suspensa: ["Suspensa", "Suspended", "Suspendida"],
  status_inapta: ["Inapta", "Unfit", "Inhabilitada"],

  // Nomes de campo e de fonte, na lista de proveniência.
  f_display_name: ["Nome", "Name", "Nombre"],
  f_legal_name: ["Razão social", "Legal name", "Razón social"],
  f_trade_name: ["Nome fantasia", "Trade name", "Nombre comercial"],
  f_cnpj: ["CNPJ", "Tax ID", "CNPJ"],
  f_phone: ["Telefone", "Phone", "Teléfono"],
  f_whatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
  f_email: ["E-mail", "Email", "Correo"],
  f_website: ["Site", "Website", "Sitio web"],
  f_instagram: ["Instagram", "Instagram", "Instagram"],
  f_facebook: ["Facebook", "Facebook", "Facebook"],
  f_linkedin: ["LinkedIn", "LinkedIn", "LinkedIn"],
  f_address: ["Endereço", "Address", "Dirección"],
  f_city: ["Cidade", "City", "Ciudad"],
  f_uf: ["Estado", "State", "Estado"],
  f_zip_code: ["CEP", "ZIP code", "Código postal"],
  f_latitude: ["Latitude", "Latitude", "Latitud"],
  f_longitude: ["Longitude", "Longitude", "Longitud"],
  f_category_key: ["Categoria", "Category", "Categoría"],
  f_main_cnae: ["CNAE", "Activity code", "CNAE"],
  f_reg_status: ["Situação", "Status", "Situación"],
  f_company_size: ["Porte", "Size", "Tamaño"],
  f_share_capital_cents: ["Capital social", "Share capital", "Capital social"],
  f_opened_at: ["Abertura", "Founded", "Apertura"],
  src_osm: ["OpenStreetMap", "OpenStreetMap", "OpenStreetMap"],
  src_cnpj: ["Receita Federal", "Tax registry", "Registro fiscal"],
  src_website: ["Site oficial", "Official website", "Sitio oficial"],
  src_social: ["Redes sociais", "Social media", "Redes sociales"],
  src_directory: ["Diretório", "Directory", "Directorio"],
  src_manual: ["Correção manual", "Manual correction", "Corrección manual"],

  ...CATEGORIES,
};

const COMMUNITY = {
  communityPill: ["Comunidade", "Community", "Comunidad"],
  communityPillAria: [
    "A comunidade: perfil, mural do líder, membros e números",
    "The community: profile, leader's board, members and numbers",
    "La comunidad: perfil, muro del líder, miembros y números",
  ],
  panelStats: ["Números", "Numbers", "Números"],
  leadsPill: ["Leads", "Leads", "Leads"],
  leadsPillAria: [
    "Encontrar clientes: empresas por categoria e cidade",
    "Find customers: companies by category and city",
    "Encontrar clientes: empresas por categoría y ciudad",
  ],
};

let added = 0;

DICTS.forEach((locale, i) => {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [ns, table] of [["Leads", LEADS], ["Community", COMMUNITY]]) {
    dict[ns] = dict[ns] || {};
    for (const [key, values] of Object.entries(table)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(`i18n prospeccao: ${added} chave(s) adicionada(s).`);
