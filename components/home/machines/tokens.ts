export type MachineId =
  | "views"
  | "divulgacao"
  | "limpeza"
  | "construcao"
  | "negocios"
  | "oportunidades"
  | "saude_beleza"
  | "saude_pet"

export type MachineTheme = {
  id: MachineId
  name: string
  label: string
  headline: string
  subheadline: string
  microcopy: string
  inputPlaceholder: string
  rotatingPlaceholders: string[]
  ctaLabel: string
  processingSteps: string[]
  resultCards: { title: string; tag: string }[]
  keywords: string[]
  colors: {
    from: string
    to: string
    glow: string
    ring: string
    accent: string
    text: string
  }
}

export const MACHINES: MachineTheme[] = [
  {
    id: "views",
    name: "Máquina de Views",
    label: "01",
    headline: "Transforme conteúdo em alcance.",
    subheadline:
      "Encontre profissionais para aumentar performance, melhorar apresentação e acelerar crescimento.",
    microcopy: "Da ideia ao alcance: encontre quem acelera seus resultados.",
    inputPlaceholder: "Quero ter muitos views",
    rotatingPlaceholders: [
      "quero viralizar meus vídeos",
      "quero crescer no YouTube",
      "quero melhorar meu CTR",
      "quero thumbnails mais fortes",
    ],
    ctaLabel: "Ativar máquina de views",
    processingSteps: [
      "analisando conteúdo...",
      "buscando editores de alta performance...",
      "identificando oportunidades de crescimento...",
      "encontrando designers com forte potencial de clique...",
      "ativando especialistas...",
    ],
    resultCards: [
      { title: "Editor de vídeo", tag: "Alta performance" },
      { title: "Editor de cortes", tag: "Cortes virais" },
      { title: "Thumbmaker", tag: "CTR elevado" },
      { title: "Designer de thumbnail", tag: "Design visual" },
      { title: "Motion designer", tag: "Animação" },
      { title: "Roteirista", tag: "Narrativa" },
      { title: "Copywriter para vídeos", tag: "Texto" },
      { title: "Estrategista de conteúdo", tag: "Crescimento" },
      { title: "Social media focado em conteúdo", tag: "Presença" },
      { title: "Especialista em YouTube", tag: "Plataforma" },
      { title: "Especialista em TikTok/Reels", tag: "Short-form" },
      { title: "Gestor de canal", tag: "Operação" },
    ],
    keywords: ["alcance", "cortes", "thumbnails", "crescimento"],
    colors: {
      from: "#6d28d9",
      to: "#2563eb",
      glow: "rgba(139,92,246,0.45)",
      ring: "rgba(139,92,246,0.7)",
      accent: "#a78bfa",
      text: "#ddd6fe",
    },
  },
  {
    id: "divulgacao",
    name: "Máquina de Divulgação",
    label: "02",
    headline: "Coloque sua marca na frente das pessoas certas.",
    subheadline:
      "Encontre influenciadores e criadores para divulgar produtos, negócios, campanhas e mensagens.",
    microcopy: "Não é só alcance. É conexão com o público certo.",
    inputPlaceholder: "Quero divulgar meu produto",
    rotatingPlaceholders: [
      "quero influenciadores no meu nicho",
      "quero alcançar mais pessoas",
      "quero creators para minha campanha",
      "quero divulgação para minha marca",
    ],
    ctaLabel: "Ativar máquina de divulgação",
    processingSteps: [
      "analisando público-alvo...",
      "cruzando nichos e audiência...",
      "encontrando criadores relevantes...",
      "selecionando perfis com potencial de alcance...",
      "ativando rede de divulgação...",
    ],
    resultCards: [
      { title: "Digital Influencer", tag: "Audiência" },
      { title: "Microinfluenciador", tag: "Nicho" },
      { title: "Creator UGC", tag: "Autêntico" },
      { title: "Afiliado", tag: "Performance" },
      { title: "Embaixador de marca", tag: "Credibilidade" },
      { title: "Creator de lifestyle", tag: "Lifestyle" },
      { title: "Creator de nicho", tag: "Especializado" },
      { title: "Apresentador de produto", tag: "Review" },
      { title: "Divulgador local", tag: "Regional" },
      { title: "Creator para campanhas", tag: "Campanha" },
      { title: "Creator para lançamentos", tag: "Lançamento" },
      { title: "Social media", tag: "Presença digital" },
      { title: "Designer gráfico", tag: "Visual" },
      { title: "Gestor de tráfego", tag: "Tráfego" },
      { title: "Copywriter", tag: "Texto" },
    ],
    keywords: ["influenciadores", "creators", "alcance", "campanhas"],
    colors: {
      from: "#e11d48",
      to: "#db2777",
      glow: "rgba(244,63,94,0.45)",
      ring: "rgba(244,63,94,0.7)",
      accent: "#fb7185",
      text: "#fecdd3",
    },
  },
  {
    id: "limpeza",
    name: "Máquina de Limpeza",
    label: "03",
    headline: "Resolva limpeza e organização sem esforço.",
    subheadline:
      "Encontre profissionais para rotina, limpeza pesada, pós-obra e organização.",
    microcopy: "Rápido, direto e sem complicação.",
    inputPlaceholder: "Preciso de uma diarista urgente",
    rotatingPlaceholders: [
      "quero limpeza pós-obra",
      "preciso organizar a casa",
      "quero uma faxina completa",
      "preciso de ajuda com limpeza urgente",
    ],
    ctaLabel: "Ativar máquina de limpeza",
    processingSteps: [
      "analisando necessidade...",
      "localizando profissionais disponíveis...",
      "priorizando rapidez e proximidade...",
      "preparando sua seleção...",
    ],
    resultCards: [
      { title: "Diarista", tag: "Disponível" },
      { title: "Faxineira", tag: "Completa" },
      { title: "Auxiliar de limpeza", tag: "Suporte" },
      { title: "Limpeza pós-obra", tag: "Pesada" },
      { title: "Limpeza pesada", tag: "Intensiva" },
      { title: "Organização residencial", tag: "Lar" },
      { title: "Organização comercial", tag: "Empresa" },
      { title: "Passadeira", tag: "Roupas" },
      { title: "Lavador de estofado", tag: "Estofados" },
      { title: "Limpeza de vidros", tag: "Vidros" },
      { title: "Limpeza de escritório", tag: "Escritório" },
    ],
    keywords: ["diarista", "organização", "pós-obra", "agilidade"],
    colors: {
      from: "#059669",
      to: "#10b981",
      glow: "rgba(16,185,129,0.45)",
      ring: "rgba(16,185,129,0.7)",
      accent: "#34d399",
      text: "#a7f3d0",
    },
  },
  {
    id: "construcao",
    name: "Máquina de Construção",
    label: "04",
    headline: "Coloque sua obra em movimento.",
    subheadline:
      "Encontre profissionais para construção, reforma, acabamento e apoio operacional.",
    microcopy: "Do reparo à reforma: encontre quem coloca a obra para andar.",
    inputPlaceholder: "Quero reformar minha casa",
    rotatingPlaceholders: [
      "preciso de pedreiro",
      "preciso de ajudante de obra",
      "quero um engenheiro",
      "preciso finalizar acabamento",
    ],
    ctaLabel: "Ativar máquina de construção",
    processingSteps: [
      "interpretando demanda...",
      "buscando profissionais de obra...",
      "combinando especialidades...",
      "estruturando sua seleção...",
    ],
    resultCards: [
      { title: "Pedreiro", tag: "Experiente" },
      { title: "Ajudante de obra", tag: "Operacional" },
      { title: "Servente", tag: "Apoio" },
      { title: "Engenheiro civil", tag: "Projeto" },
      { title: "Arquiteto", tag: "Design" },
      { title: "Pintor", tag: "Acabamento" },
      { title: "Azulejista", tag: "Revestimento" },
      { title: "Gesseiro", tag: "Gesso" },
      { title: "Eletricista", tag: "Elétrica" },
      { title: "Encanador", tag: "Hidráulica" },
      { title: "Instalador", tag: "Instalação" },
      { title: "Mestre de obras", tag: "Gestão" },
      { title: "Marceneiro", tag: "Madeira" },
      { title: "Serralheiro", tag: "Metal" },
    ],
    keywords: ["reforma", "obra", "acabamento", "execução"],
    colors: {
      from: "#ea580c",
      to: "#f59e0b",
      glow: "rgba(249,115,22,0.45)",
      ring: "rgba(249,115,22,0.7)",
      accent: "#fb923c",
      text: "#fed7aa",
    },
  },
  {
    id: "negocios",
    name: "Máquina de Negócios",
    label: "05",
    headline: "Acelere seu negócio com as pessoas certas.",
    subheadline:
      "Encontre profissionais para marketing, design, operação, atendimento e crescimento.",
    microcopy: "Menos improviso. Mais gente certa para fazer o negócio crescer.",
    inputPlaceholder: "Quero mais clientes",
    rotatingPlaceholders: [
      "preciso de social media",
      "quero vender mais",
      "preciso de tráfego pago",
      "quero melhorar minha comunicação",
    ],
    ctaLabel: "Ativar máquina de negócios",
    processingSteps: [
      "analisando objetivo de negócio...",
      "cruzando perfis compatíveis...",
      "encontrando especialistas...",
      "ativando oportunidades de crescimento...",
    ],
    resultCards: [
      { title: "SDR", tag: "Prospecção" },
      { title: "Closer", tag: "Vendas" },
      { title: "Assistente virtual", tag: "Suporte" },
      { title: "Atendimento ao cliente", tag: "Conversão" },
      { title: "Suporte operacional", tag: "Rotina" },
      { title: "Analista de CRM", tag: "Dados" },
      { title: "Web designer", tag: "Interface" },
      { title: "Desenvolvimento de software", tag: "Tech" },
      { title: "Consultor comercial", tag: "Estratégia" },
      { title: "Especialista em automação", tag: "Automação" },
      { title: "Analista de marketing", tag: "Marketing" },
    ],
    keywords: ["clientes", "tráfego", "social media", "design"],
    colors: {
      from: "#0ea5e9",
      to: "#06b6d4",
      glow: "rgba(14,165,233,0.45)",
      ring: "rgba(14,165,233,0.7)",
      accent: "#38bdf8",
      text: "#bae6fd",
    },
  },
  {
    id: "oportunidades",
    name: "Máquina de Oportunidades",
    label: "06",
    headline: "Quem precisa encontra. Quem oferece aparece.",
    subheadline:
      "Uma experiência criada para quem quer resolver rápido e para quem quer ser visto.",
    microcopy: "Dois lados. Um sistema. Zero intermediação.",
    inputPlaceholder: "",
    rotatingPlaceholders: [],
    ctaLabel: "Entrar na vitrine",
    processingSteps: [],
    resultCards: [
      { title: "Freelancer geral", tag: "Versátil" },
      { title: "Assistente geral", tag: "Suporte" },
      { title: "Auxiliar administrativo", tag: "Organização" },
      { title: "Recepcionista", tag: "Atendimento" },
      { title: "Promotor", tag: "Divulgação" },
      { title: "Divulgador", tag: "Alcance" },
      { title: "Captador de leads", tag: "Leads" },
      { title: "Operador digital", tag: "Digital" },
      { title: "Suporte geral", tag: "Multi" },
      { title: "Profissional multitarefa", tag: "Flexível" },
      { title: "Prestador local", tag: "Proximidade" },
      { title: "Parceiro comercial", tag: "Negócios" },
    ],
    keywords: ["vitrine", "visibilidade", "encontro", "oportunidade"],
    colors: {
      from: "#e6b800",
      to: "#f59e0b",
      glow: "rgba(230,184,0,0.45)",
      ring: "rgba(230,184,0,0.7)",
      accent: "#fbbf24",
      text: "#fde68a",
    },
  },
  {
    id: "saude_beleza",
    name: "Máquina de Saúde e Beleza",
    label: "07",
    headline: "Cuide da sua imagem com quem entende do assunto.",
    subheadline:
      "Encontre profissionais de beleza, estética e bem-estar perto de você.",
    microcopy: "Do relaxamento à produção: autoestima com gente certa.",
    inputPlaceholder: "Quero agendar um atendimento",
    rotatingPlaceholders: [
      "quero massagem relaxante",
      "preciso de maquiadora",
      "quero fazer sobrancelha",
      "procuro cabeleireiro",
    ],
    ctaLabel: "Ativar máquina de saúde e beleza",
    processingSteps: [
      "analisando pedido...",
      "localizando profissionais disponíveis...",
      "cruzando especialidades...",
      "preparando sua seleção...",
    ],
    resultCards: [
      { title: "Massagista", tag: "Relaxamento" },
      { title: "Massoterapeuta", tag: "Terapia" },
      { title: "Esteticista", tag: "Pele" },
      { title: "Designer de sobrancelhas", tag: "Design" },
      { title: "Maquiadora", tag: "Produção" },
      { title: "Cabeleireiro", tag: "Corte" },
      { title: "Barbeiro", tag: "Barba" },
      { title: "Manicure", tag: "Unhas" },
      { title: "Pedicure", tag: "Pés" },
      { title: "Lash designer", tag: "Olhar" },
      { title: "Terapeuta corporal", tag: "Corpo" },
      { title: "Drenagem linfática", tag: "Saúde" },
      { title: "Depiladora", tag: "Depilação" },
      { title: "Micropigmentadora", tag: "Micropigmentação" },
      { title: "Spa/relaxamento", tag: "Bem-estar" },
    ],
    keywords: ["beleza", "estética", "massagem", "autoestima"],
    colors: {
      from: "#d946ef",
      to: "#ec4899",
      glow: "rgba(217,70,239,0.45)",
      ring: "rgba(217,70,239,0.7)",
      accent: "#e879f9",
      text: "#fbcfe8",
    },
  },
  {
    id: "saude_pet",
    name: "Máquina de Saúde do Pet",
    label: "08",
    headline: "Seu pet cuidado como merece.",
    subheadline:
      "Encontre profissionais para banho, tosa, adestramento, veterinária e mais.",
    microcopy: "Do banho ao veterinário: rede completa para o seu pet.",
    inputPlaceholder: "Quero agendar banho e tosa",
    rotatingPlaceholders: [
      "preciso de dog walker",
      "quero adestrador",
      "procuro veterinário em casa",
      "quero hotel para pets",
    ],
    ctaLabel: "Ativar máquina de saúde do pet",
    processingSteps: [
      "analisando necessidade...",
      "buscando cuidadores próximos...",
      "selecionando especialistas...",
      "preparando sua seleção...",
    ],
    resultCards: [
      { title: "Banhista", tag: "Banho" },
      { title: "Tosador", tag: "Tosa" },
      { title: "Groomer", tag: "Estética" },
      { title: "Dog walker", tag: "Passeio" },
      { title: "Pet sitter", tag: "Cuidado" },
      { title: "Adestrador", tag: "Comportamento" },
      { title: "Cuidador de pets", tag: "Domiciliar" },
      { title: "Hotel para pets", tag: "Hospedagem" },
      { title: "Transporte pet", tag: "Mobilidade" },
      { title: "Veterinário", tag: "Saúde" },
      { title: "Auxiliar veterinário", tag: "Suporte" },
      { title: "Fisioterapia animal", tag: "Reabilitação" },
      { title: "Recreador pet", tag: "Diversão" },
      { title: "Cuidador domiciliar de pets", tag: "Casa" },
    ],
    keywords: ["pet", "banho", "veterinário", "adestramento"],
    colors: {
      from: "#0d9488",
      to: "#14b8a6",
      glow: "rgba(20,184,166,0.45)",
      ring: "rgba(20,184,166,0.7)",
      accent: "#2dd4bf",
      text: "#99f6e4",
    },
  },
]

export const getMachine = (id: MachineId) =>
  MACHINES.find((m) => m.id === id) as MachineTheme
