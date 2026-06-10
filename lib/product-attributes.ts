// =============================================================================
// Subfiltros de produto por categoria (Loja / aba Produtos do /search).
// Fonte única do "schema" de atributos: alimenta tanto os campos dinâmicos do
// formulário do vendedor (profile-product-edit-modal) quanto o painel de
// filtros drill-in do comprador (FilterRail / search).
// Os valores são gravados em tb_profile_product.attributes (JSONB, mig 139) e
// filtrados genericamente pelo backend via querystring attr_<chave>.
// Chaves SEMPRE [a-z0-9_] — o backend descarta o resto.
// =============================================================================

export type AttrFieldType = "chips" | "colors" | "range" | "brand"

export interface AttrField {
  /** chave no JSONB e na querystring (attr_<key>) */
  key: string
  label: string
  type: AttrFieldType
  /** chips: opções fixas */
  options?: string[]
  /** range: limites da régua (ex.: numeração de calçado) */
  min?: number
  max?: number
  step?: number
  unit?: string
  /** brand: sugestões de marcas populares da categoria */
  suggestions?: string[]
}

/** Paleta canônica de cores — o nome (minúsculo) é o valor gravado/filtrado. */
export const COLOR_SWATCHES: { name: string; hex: string }[] = [
  { name: "branco", hex: "#FFFFFF" },
  { name: "preto", hex: "#0B0B0D" },
  { name: "cinza", hex: "#8E8E93" },
  { name: "vermelho", hex: "#E0312D" },
  { name: "laranja", hex: "#F2742C" },
  { name: "amarelo", hex: "#F2B705" },
  { name: "verde", hex: "#2E9E44" },
  { name: "azul", hex: "#2E62D9" },
  { name: "roxo", hex: "#7B3FE4" },
  { name: "rosa", hex: "#E85B8A" },
  { name: "marrom", hex: "#7B4B2A" },
  { name: "bege", hex: "#D9C7A7" },
  { name: "dourado", hex: "#C9A227" },
  { name: "prateado", hex: "#BFC5CC" },
  { name: "colorido", hex: "" }, // renderizado como gradiente
]

const COLORS: AttrField = { key: "colors", label: "Cor", type: "colors" }
const CONDITION: AttrField = {
  key: "condicao", label: "Condição", type: "chips",
  options: ["Novo", "Usado", "Recondicionado"],
}
const VOLTAGE: AttrField = {
  key: "voltagem", label: "Voltagem", type: "chips",
  options: ["110V", "220V", "Bivolt", "USB/Bateria"],
}
const CLOTHING_SIZES: AttrField = {
  key: "sizes", label: "Tamanho", type: "chips",
  options: ["PP", "P", "M", "G", "GG", "XG", "Único"],
}
const GENDER: AttrField = {
  key: "genero", label: "Gênero", type: "chips",
  options: ["Masculino", "Feminino", "Unissex", "Infantil"],
}

/** Schema por slug de tb_product_category (mig 068). */
export const PRODUCT_ATTRIBUTE_SCHEMAS: Record<string, AttrField[]> = {
  vestuario: [
    CLOTHING_SIZES,
    COLORS,
    GENDER,
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Nike", "Adidas", "Hering", "Lacoste", "Levi's", "Zara"] },
  ],
  calcados: [
    { key: "sizes", label: "Tamanho", type: "range", min: 33, max: 46, step: 1 },
    COLORS,
    GENDER,
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Nike", "Adidas", "Olympikus", "Mizuno", "Havaianas", "Melissa", "Vans"] },
  ],
  acessorios: [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Bolsas", "Mochilas", "Relógios", "Óculos", "Joias", "Bijuterias", "Cintos", "Bonés e Chapéus"] },
    COLORS,
    { key: "material", label: "Material", type: "chips", options: ["Couro", "Tecido", "Metal", "Prata", "Ouro", "Aço", "Plástico"] },
    { key: "brand", label: "Marca", type: "brand" },
  ],
  eletronicos: [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Áudio", "TV e Vídeo", "Celulares", "Câmeras", "Smartwatch", "Drones", "Outros"] },
    CONDITION,
    VOLTAGE,
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Samsung", "LG", "Sony", "Xiaomi", "JBL", "Philips", "Motorola"] },
  ],
  eletrodomesticos: [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Cozinha", "Lavanderia", "Climatização", "Limpeza", "Portáteis"] },
    { key: "voltagem", label: "Voltagem", type: "chips", options: ["110V", "220V", "Bivolt"] },
    { key: "condicao", label: "Condição", type: "chips", options: ["Novo", "Usado"] },
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Brastemp", "Electrolux", "Consul", "Philco", "Mondial", "Arno"] },
  ],
  informatica: [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Notebooks", "Desktops", "Monitores", "Periféricos", "Componentes", "Impressoras", "Redes"] },
    CONDITION,
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Dell", "Lenovo", "Acer", "Asus", "HP", "Logitech", "Positivo"] },
  ],
  games: [
    { key: "plataforma", label: "Plataforma", type: "chips", options: ["PlayStation 5", "PlayStation 4", "Xbox Series", "Xbox One", "Nintendo Switch", "PC", "Retrô"] },
    { key: "tipo", label: "Tipo", type: "chips", options: ["Console", "Jogo", "Acessório", "Cadeira gamer"] },
    { key: "condicao", label: "Condição", type: "chips", options: ["Novo", "Usado"] },
  ],
  "casa-e-decoracao": [
    { key: "ambiente", label: "Ambiente", type: "chips", options: ["Sala", "Quarto", "Cozinha", "Banheiro", "Escritório", "Área externa"] },
    { key: "tipo", label: "Tipo", type: "chips", options: ["Decoração", "Iluminação", "Cama, mesa e banho", "Organização", "Utilidades"] },
    COLORS,
    { key: "material", label: "Material", type: "chips", options: ["Madeira", "Vidro", "Cerâmica", "Metal", "Tecido", "Plástico"] },
  ],
  moveis: [
    { key: "ambiente", label: "Ambiente", type: "chips", options: ["Sala", "Quarto", "Cozinha", "Banheiro", "Escritório", "Área externa"] },
    { key: "material", label: "Material", type: "chips", options: ["Madeira maciça", "MDF/MDP", "Metal", "Vidro", "Estofado", "Vime/Rattan"] },
    COLORS,
    { key: "condicao", label: "Condição", type: "chips", options: ["Novo", "Usado"] },
  ],
  artesanato: [
    { key: "tecnica", label: "Técnica", type: "chips", options: ["Crochê", "Tricô", "Bordado", "Costura", "Madeira", "Cerâmica", "Resina", "Macramê", "Papel"] },
    COLORS,
    { key: "producao", label: "Produção", type: "chips", options: ["Pronta entrega", "Sob encomenda"] },
  ],
  "beleza-e-cosmeticos": [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Skincare", "Maquiagem", "Cabelos", "Perfumes", "Unhas", "Barba"] },
    { key: "caracteristicas", label: "Características", type: "chips", options: ["Vegano", "Cruelty-free", "Natural/Orgânico", "Hipoalergênico"] },
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Natura", "O Boticário", "Avon", "Eudora", "Ruby Rose", "Vult"] },
  ],
  "produtos-pet": [
    { key: "animal", label: "Animal", type: "chips", options: ["Cachorro", "Gato", "Pássaros", "Peixes", "Roedores", "Répteis"] },
    { key: "tipo", label: "Tipo", type: "chips", options: ["Alimentação", "Brinquedos", "Higiene", "Camas e Casinhas", "Coleiras e Passeio", "Roupas"] },
    { key: "porte", label: "Porte", type: "chips", options: ["Pequeno", "Médio", "Grande"] },
  ],
  "alimentos-artesanais": [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Doces e Sobremesas", "Salgados", "Pães e Confeitaria", "Bebidas", "Conservas e Molhos", "Temperos", "Congelados"] },
    { key: "restricoes", label: "Restrições", type: "chips", options: ["Sem glúten", "Sem lactose", "Vegano", "Vegetariano", "Zero açúcar", "Sem conservantes"] },
  ],
  papelaria: [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Cadernos e Agendas", "Canetas e Lápis", "Material escolar", "Material de escritório", "Arte e Pintura", "Adesivos e Planners"] },
    COLORS,
  ],
  "livros-e-materiais": [
    { key: "genero", label: "Gênero", type: "chips", options: ["Ficção", "Não-ficção", "Infantil", "Didático", "Técnico", "Autoajuda", "HQs e Mangás", "Religioso"] },
    { key: "condicao", label: "Condição", type: "chips", options: ["Novo", "Usado"] },
    { key: "idioma", label: "Idioma", type: "chips", options: ["Português", "Inglês", "Espanhol", "Outros"] },
  ],
  ferramentas: [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Manuais", "Elétricas", "Medição", "Jardinagem", "Pintura", "Kits"] },
    { key: "voltagem", label: "Alimentação", type: "chips", options: ["110V", "220V", "Bivolt", "Bateria", "Manual"] },
    { key: "condicao", label: "Condição", type: "chips", options: ["Novo", "Usado"] },
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Bosch", "Makita", "DeWalt", "Tramontina", "Vonder", "Stanley"] },
  ],
  "autopecas-e-acessorios": [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Peças de motor", "Suspensão e Freios", "Elétrica", "Som e Multimídia", "Acessórios internos", "Acessórios externos", "Pneus e Rodas", "Motos"] },
    CONDITION,
  ],
  "esporte-e-fitness": [
    { key: "modalidade", label: "Modalidade", type: "chips", options: ["Academia e Musculação", "Futebol", "Ciclismo", "Corrida", "Natação", "Lutas", "Camping e Trilha", "Skate"] },
    CLOTHING_SIZES,
    COLORS,
    { key: "brand", label: "Marca", type: "brand", suggestions: ["Nike", "Adidas", "Puma", "Penalty", "Kikos", "Caloi"] },
  ],
  "bebes-e-criancas": [
    { key: "faixa_etaria", label: "Faixa etária", type: "chips", options: ["0-6 meses", "6-12 meses", "1-2 anos", "3-5 anos", "6-8 anos", "9-12 anos"] },
    { key: "tipo", label: "Tipo", type: "chips", options: ["Roupas", "Calçados", "Brinquedos", "Higiene e Banho", "Quarto e Decoração", "Passeio"] },
    { key: "genero", label: "Gênero", type: "chips", options: ["Menina", "Menino", "Unissex"] },
  ],
  "festas-e-eventos": [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Decoração", "Balões", "Descartáveis", "Lembrancinhas", "Fantasias", "Painéis e Toppers", "Convites"] },
    COLORS,
  ],
  "saude-e-bem-estar": [
    { key: "tipo", label: "Tipo", type: "chips", options: ["Suplementos", "Vitaminas", "Ortopédicos", "Massagem e Relaxamento", "Aromaterapia", "Equipamentos de medição"] },
    { key: "caracteristicas", label: "Características", type: "chips", options: ["Natural", "Vegano", "Sem açúcar"] },
  ],
  outros: [
    { key: "condicao", label: "Condição", type: "chips", options: ["Novo", "Usado"] },
  ],
}

export type ProductAttributes = Record<string, string | string[]>

export function getAttributeSchema(slug: string | null | undefined): AttrField[] {
  if (!slug) return []
  return PRODUCT_ATTRIBUTE_SCHEMAS[slug] ?? []
}

/** Lista de tamanhos numéricos de um campo range (pro vendedor marcar chips). */
export function rangeValues(field: AttrField): string[] {
  const min = field.min ?? 0
  const max = field.max ?? 0
  const step = field.step ?? 1
  const out: string[] = []
  for (let v = min; v <= max; v += step) out.push(String(v))
  return out
}
