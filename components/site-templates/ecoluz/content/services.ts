// OS SERVIÇOS — um por página, com texto PRÓPRIO.
//
// ⚠️ NENHUMA PÁGINA É OUTRA COM O NOME TROCADO. Página repetida com uma
// palavra substituída é exatamente o padrão que o buscador trata como
// conteúdo duplicado, e o efeito é o oposto do pretendido: em vez de cinco
// portas de entrada, a EcoLuz teria uma e quatro sombras dela.
//
// ⚠️ E NENHUMA AFIRMA NÚMERO QUE NINGUÉM APUROU. Não há promessa de
// porcentagem de economia, de prazo de retorno nem de potência: isso depende
// de consumo, tarifa, telhado e forma de pagamento, e é o que a análise
// técnica responde. O que o site promete é o PROCESSO, que é o que a EcoLuz
// controla.

import type { IconName } from "../icons";

export type Service = {
  slug: string;
  /** O rótulo curto — menu, card, breadcrumb. */
  label: string;
  /** O H1 da página dele. */
  h1: string;
  title: string;
  description: string;
  eyebrow: string;
  icon: IconName;
  /** A frase do card na home. */
  card: string;
  /** A mensagem com que o WhatsApp abre a partir desta página. */
  wa: string;
  /** A abertura da página — dois ou três parágrafos. */
  intro: string[];
  /** Para quem é. */
  forWho: { title: string; items: string[] };
  /** O que está incluído. */
  covers: { title: string; lead: string; items: { title: string; text: string }[] };
  faq: { q: string; a: string }[];
  /** Os outros serviços que esta página aponta — ver "veja também". */
  related: string[];
};

export const SERVICES: Service[] = [
  {
    slug: "energia-solar-residencial",
    label: "Solar residencial",
    h1: "Energia solar para a sua casa",
    title: "Energia solar residencial em São Luís | EcoLuz",
    description:
      "Projeto de energia solar para casas em São Luís e região: dimensionamento pelo seu consumo, instalação e homologação na concessionária. Peça uma análise da sua conta.",
    eyebrow: "Para a casa",
    icon: "home",
    card: "O sistema é dimensionado pela sua conta de luz — não por um pacote pronto de prateleira.",
    wa: "Olá! Quero energia solar na minha casa. Podemos analisar a minha conta de luz?",
    intro: [
      "Numa casa, a conta de luz é uma despesa que só sobe e nunca vira patrimônio. A energia solar troca essa lógica: o mesmo dinheiro que ia embora todo mês passa a pagar um sistema que fica no imóvel.",
      "O projeto começa pela sua conta. É o histórico de consumo — não o tamanho do telhado nem o número de pessoas na casa — que diz quantos módulos o sistema precisa ter para cobrir o que você realmente gasta.",
    ],
    forWho: {
      title: "Faz sentido para você se",
      items: [
        "A conta de luz já é uma das maiores despesas fixas da casa.",
        "Você pretende ficar no imóvel — ou quer que ele valha mais quando for vendido.",
        "Tem telhado, laje ou área livre com boa exposição ao sol durante o dia.",
        "Quer previsibilidade: saber que o aumento da tarifa não vai mais pesar do mesmo jeito.",
      ],
    },
    covers: {
      title: "O que entra no projeto",
      lead: "A EcoLuz entrega o sistema funcionando e homologado — não só os equipamentos na porta de casa.",
      items: [
        {
          title: "Análise da conta",
          text: "Leitura do histórico de consumo e da tarifa para dimensionar o sistema pelo gasto real, e não por estimativa.",
        },
        {
          title: "Projeto e equipamentos",
          text: "Módulos, inversor e estrutura escolhidos para o seu telhado e para o consumo que o sistema precisa cobrir.",
        },
        {
          title: "Instalação",
          text: "Execução por equipe técnica, com fixação adequada ao tipo de cobertura e acabamento elétrico organizado.",
        },
        {
          title: "Homologação na concessionária",
          text: "A EcoLuz cuida da documentação e do processo junto à distribuidora até o sistema ser aprovado e conectado.",
        },
      ],
    },
    faq: [
      {
        q: "Preciso de bateria para ter energia solar em casa?",
        a: "Não. O sistema residencial mais comum é conectado à rede: o que você gera durante o dia e não consome vira crédito na concessionária, e você usa esse crédito à noite. A bateria só entra quando o objetivo é ter energia mesmo com a rede fora do ar — que é o sistema off-grid ou híbrido.",
      },
      {
        q: "Minha conta vai a zero?",
        a: "Não vai a zero. Mesmo com o sistema cobrindo todo o consumo, a concessionária cobra o custo de disponibilidade — um valor mínimo por estar conectado à rede — além dos tributos e da iluminação pública. O que o projeto reduz é a parte da conta que corresponde à energia consumida.",
      },
      {
        q: "Quanto tempo leva para ficar pronto?",
        a: "A instalação em si costuma ser a parte mais rápida. O prazo total depende da homologação na concessionária, que tem etapas e tempos próprios — e é justamente por isso que a EcoLuz conduz esse processo em vez de deixá-lo com o cliente.",
      },
      {
        q: "E se eu me mudar?",
        a: "O sistema é parte do imóvel e entra na negociação como benfeitoria: quem compra recebe uma casa com a conta de luz menor, o que costuma ser um argumento a favor na venda.",
      },
    ],
    related: ["sistema-off-grid", "projeto-e-homologacao"],
  },

  {
    slug: "energia-solar-para-empresas",
    label: "Solar para empresas",
    h1: "Energia solar para empresas e comércios",
    title: "Energia solar para empresas em São Luís | EcoLuz",
    description:
      "Projetos de energia solar para comércios, clínicas, restaurantes e pequenas indústrias em São Luís. Custo fixo previsível e dimensionamento pelo consumo real do negócio.",
    eyebrow: "Para o negócio",
    icon: "building",
    card: "Energia é custo fixo. Num negócio, ela entra na formação de preço — e quando sobe, come margem.",
    wa: "Olá! Quero energia solar para a minha empresa. Podemos avaliar o consumo?",
    intro: [
      "Numa empresa, a conta de luz não é só despesa: ela entra na formação do preço. Quando a tarifa sobe, ou o preço sobe junto ou a margem encolhe — e nenhuma das duas é uma escolha confortável.",
      "Um sistema bem dimensionado transforma essa variável em algo previsível. O consumo de um comércio costuma ser diurno, o que joga a favor: boa parte do que é gerado é consumida na hora, sem nem precisar virar crédito.",
    ],
    forWho: {
      title: "Perfis que mais sentem a diferença",
      items: [
        "Restaurantes, padarias e lanchonetes, com câmaras frias e fornos ligados o dia inteiro.",
        "Clínicas, consultórios e laboratórios, com climatização e equipamentos em uso contínuo.",
        "Mercados e lojas com refrigeração, iluminação e ar-condicionado no horário comercial.",
        "Escritórios, salões e pequenas indústrias com carga estável ao longo do dia.",
      ],
    },
    covers: {
      title: "Como o projeto empresarial é montado",
      lead: "O ponto de partida é o mesmo — a conta —, mas a leitura é outra: aqui pesam o perfil de carga e o horário em que o consumo acontece.",
      items: [
        {
          title: "Leitura do perfil de consumo",
          text: "Análise do histórico e do horário de operação para entender quanto da geração é consumida na hora e quanto vira crédito.",
        },
        {
          title: "Dimensionamento e proposta",
          text: "Cenário de economia e de retorno apresentado antes da decisão, com o tamanho do sistema justificado pelo consumo.",
        },
        {
          title: "Execução com a operação de pé",
          text: "Instalação planejada para interferir o mínimo possível no funcionamento do negócio.",
        },
        {
          title: "Homologação e acompanhamento",
          text: "Processo junto à concessionária conduzido pela EcoLuz e monitoramento do desempenho depois da ativação.",
        },
      ],
    },
    faq: [
      {
        q: "Dá para instalar sem parar o funcionamento?",
        a: "Na maior parte dos casos, sim. A instalação é planejada junto com o cliente, e as etapas que exigem desligamento são combinadas para os horários de menor movimento.",
      },
      {
        q: "E se o consumo da empresa crescer depois?",
        a: "O sistema pode ser ampliado. Vale avisar isso na análise: quando já se sabe que a operação vai crescer, o projeto pode ser pensado para receber módulos adicionais sem retrabalho.",
      },
      {
        q: "Serve para imóvel alugado?",
        a: "Serve, mas exige alinhamento com o proprietário, porque o sistema é fixado na estrutura do imóvel. É um dos pontos que a análise técnica levanta antes de qualquer proposta.",
      },
    ],
    related: ["energia-solar-residencial", "manutencao-e-monitoramento"],
  },

  {
    slug: "sistema-off-grid",
    label: "Sistema off-grid",
    h1: "Sistema off-grid: energia com baterias",
    title: "Sistema solar off-grid com baterias no Maranhão | EcoLuz",
    description:
      "Sistemas solares off-grid e híbridos com baterias para sítios, chácaras e locais sem rede elétrica ou com queda constante de energia no Maranhão.",
    eyebrow: "Autonomia",
    icon: "battery",
    card: "Para onde a rede não chega — ou chega e cai. A energia fica armazenada e o sistema segue funcionando.",
    wa: "Olá! Quero saber sobre sistema solar off-grid com baterias.",
    intro: [
      "Nem todo lugar tem rede elétrica confiável, e alguns simplesmente não têm rede. É aí que entra o sistema off-grid: em vez de mandar o excedente para a concessionária, ele guarda essa energia em baterias para usar quando o sol não está gerando.",
      "É a diferença entre economizar e ter autonomia. Num sistema conectado à rede, se a energia da concessionária cai, o sistema desliga junto — por segurança de quem trabalha na rede. Num off-grid ou híbrido, não: a casa continua ligada.",
      "Este é o serviço que atende quem está fora do perímetro urbano, em área rural, ou quem convive com quedas frequentes e precisa manter equipamentos essenciais funcionando.",
    ],
    forWho: {
      title: "Quando o off-grid é a resposta certa",
      items: [
        "Sítios, chácaras e propriedades rurais onde a rede não chega ou chegaria a um custo alto de extensão.",
        "Locais com queda de energia frequente, onde o problema não é o valor da conta e sim a interrupção.",
        "Bombeamento de água, câmaras frias e equipamentos que não podem parar.",
        "Quem quer manter uma parte da casa funcionando — geladeira, iluminação, internet — mesmo com a rede fora.",
      ],
    },
    covers: {
      title: "Off-grid, híbrido e conectado à rede",
      lead: "São três arranjos diferentes, e escolher errado custa caro nos dois sentidos: bateria a mais é dinheiro parado, bateria de menos é autonomia que acaba no meio da noite.",
      items: [
        {
          title: "Conectado à rede (sem bateria)",
          text: "O mais comum e o mais barato por energia gerada. Usa a rede como se fosse a bateria, via créditos — mas desliga junto com ela quando falta energia.",
        },
        {
          title: "Off-grid (isolado)",
          text: "Independente da concessionária. Toda a energia passa pelo banco de baterias, e o dimensionamento precisa cobrir os dias de menor geração.",
        },
        {
          title: "Híbrido",
          text: "Fica conectado à rede e mantém um banco de baterias para as cargas essenciais. Economiza no dia a dia e continua de pé na queda.",
        },
        {
          title: "Dimensionamento da autonomia",
          text: "Quantas horas — ou dias — o sistema precisa sustentar sozinho é a pergunta que define o banco de baterias, e ela é respondida com o cliente.",
        },
      ],
    },
    faq: [
      {
        q: "Qual a diferença entre off-grid e híbrido?",
        a: "O off-grid é totalmente independente: não há ligação com a concessionária, e tudo que a casa consome vem do sistema. O híbrido mantém as duas coisas — continua conectado à rede e economizando como um sistema comum, mas tem baterias que assumem as cargas essenciais quando a energia cai.",
      },
      {
        q: "As baterias duram quanto tempo?",
        a: "Depende da tecnologia e de como o sistema é usado. É um componente com vida útil própria, menor que a dos módulos, e isso precisa estar claro na conta desde a proposta — não é uma informação para descobrir depois.",
      },
      {
        q: "Off-grid é mais caro?",
        a: "Por energia gerada, sim: o banco de baterias é um custo que o sistema conectado à rede não tem. A comparação justa não é com o sistema comum e sim com a alternativa real — estender rede elétrica até o local, conviver com as quedas ou manter um gerador a combustível.",
      },
      {
        q: "Dá para começar sem bateria e adicionar depois?",
        a: "Em muitos casos sim, desde que o projeto seja pensado assim desde o início — principalmente na escolha do inversor. É exatamente o tipo de decisão que fica cara quando é tomada depois.",
      },
    ],
    related: ["energia-solar-residencial", "projeto-e-homologacao"],
  },

  {
    slug: "projeto-e-homologacao",
    label: "Projeto e homologação",
    h1: "Projeto, documentação e homologação",
    title: "Projeto e homologação de energia solar no Maranhão | EcoLuz",
    description:
      "Dimensionamento, projeto elétrico e homologação do sistema solar junto à concessionária no Maranhão. A EcoLuz conduz o processo do início à aprovação.",
    eyebrow: "Engenharia",
    icon: "file",
    card: "A parte que ninguém vê e que decide se o sistema entra em operação — ou fica no telhado esperando.",
    wa: "Olá! Quero entender o projeto e a homologação de um sistema solar.",
    intro: [
      "Um sistema solar não passa a gerar crédito porque foi instalado: ele precisa ser aprovado e conectado pela concessionária. Essa etapa tem documentação, projeto elétrico, prazos e exigências técnicas próprias.",
      "É a parte do processo em que mais gente trava — e é por isso que ela é um serviço, e não uma linha miúda no contrato. A EcoLuz conduz a homologação do início até a aprovação, com o cliente acompanhando em vez de correr atrás.",
    ],
    forWho: {
      title: "Este serviço resolve",
      items: [
        "Dimensionamento técnico do sistema a partir do consumo e das condições do local.",
        "Projeto elétrico e documentação exigida pela concessionária.",
        "Abertura e acompanhamento do processo até a aprovação e a troca do medidor.",
        "Sistemas já instalados por terceiros que ficaram sem homologação e não geram crédito.",
      ],
    },
    covers: {
      title: "Da conta ao medidor novo",
      lead: "O caminho tem etapas fixas, e saber em qual delas o processo está é o que separa acompanhar de esperar.",
      items: [
        {
          title: "Diagnóstico",
          text: "Leitura da conta, do padrão de entrada e das condições do local de instalação.",
        },
        {
          title: "Projeto",
          text: "Dimensionamento e projeto elétrico do sistema, com a estimativa de geração que sustenta a proposta.",
        },
        {
          title: "Solicitação de acesso",
          text: "Abertura do processo junto à concessionária com a documentação exigida.",
        },
        {
          title: "Vistoria e conexão",
          text: "Acompanhamento até a vistoria, a troca do medidor e a liberação para o sistema começar a gerar crédito.",
        },
      ],
    },
    faq: [
      {
        q: "Já tenho um sistema instalado, mas sem homologação. Dá para resolver?",
        a: "Dá, e é um caso que aparece com frequência. A EcoLuz avalia o que foi instalado, verifica se atende às exigências técnicas e conduz o processo — quando necessário, apontando antes o que precisa ser corrigido.",
      },
      {
        q: "Preciso pagar alguma coisa para a concessionária?",
        a: "A solicitação de acesso em si costuma não ter custo para o consumidor. O que pode existir é custo de adequação do padrão de entrada, e isso é levantado no diagnóstico, antes da proposta.",
      },
      {
        q: "Por que a homologação demora?",
        a: "Porque o prazo é da concessionária, não de quem instala. O que a EcoLuz controla é entregar a documentação correta na primeira vez — exigência devolvida por erro de projeto é o que faz um processo simples levar meses.",
      },
    ],
    related: ["energia-solar-residencial", "energia-solar-para-empresas"],
  },

  {
    slug: "manutencao-e-monitoramento",
    label: "Manutenção e monitoramento",
    h1: "Manutenção, monitoramento e ampliação",
    title: "Manutenção e monitoramento de sistema solar | EcoLuz",
    description:
      "Acompanhamento de desempenho, limpeza técnica, manutenção e ampliação de sistemas de energia solar já instalados em São Luís e região.",
    eyebrow: "Depois da instalação",
    icon: "wrench",
    card: "Um sistema pode gerar menos e ninguém perceber por meses — a conta só volta a subir devagar.",
    wa: "Olá! Preciso de manutenção ou acompanhamento do meu sistema solar.",
    intro: [
      "Sistema solar tem pouca manutenção, o que é diferente de nenhuma. Módulo sujo, sombra nova de uma árvore que cresceu, um inversor com falha intermitente — nada disso desliga o sistema. Só faz ele gerar menos.",
      "E como a queda é gradual, quase ninguém percebe pela conta: ela volta a subir devagar, e a explicação mais fácil é sempre outra. O acompanhamento existe para que o desempenho seja medido em vez de suposto.",
    ],
    forWho: {
      title: "Quando chamar",
      items: [
        "A conta de luz voltou a subir sem mudança de hábito na casa ou no negócio.",
        "O inversor mostra erro, desliga sozinho ou tem comportamento diferente do normal.",
        "Faz tempo que os módulos não são limpos — em região de poeira e maresia isso pesa.",
        "O consumo aumentou e o sistema, que era suficiente, deixou de ser.",
      ],
    },
    covers: {
      title: "O que o acompanhamento cobre",
      lead: "O objetivo é simples: que a economia que apareceu no primeiro ano continue aparecendo no quinto.",
      items: [
        {
          title: "Monitoramento de desempenho",
          text: "Comparação entre o que o sistema gera e o que ele deveria gerar, para que a queda seja notada cedo.",
        },
        {
          title: "Limpeza técnica",
          text: "Remoção da sujeira acumulada nos módulos, feita com o cuidado que a superfície exige.",
        },
        {
          title: "Manutenção corretiva",
          text: "Diagnóstico e correção de falhas em inversor, conexões e estrutura.",
        },
        {
          title: "Ampliação",
          text: "Aumento do sistema quando o consumo cresceu, aproveitando o que já está instalado.",
        },
      ],
    },
    faq: [
      {
        q: "De quanto em quanto tempo os módulos precisam ser limpos?",
        a: "Depende muito do local. Perto do mar, de via sem asfalto ou de obra, a sujeira se acumula mais rápido. Não existe um número que sirva para todo mundo — o que existe é acompanhar a geração e limpar quando ela começa a cair sem outra explicação.",
      },
      {
        q: "Atendem sistema instalado por outra empresa?",
        a: "Sim. A avaliação começa pelo que está instalado e pelo que o sistema está gerando hoje, independentemente de quem executou.",
      },
      {
        q: "Posso aumentar o sistema que já tenho?",
        a: "Na maioria dos casos sim. O que decide é a capacidade do inversor e o espaço disponível — e a ampliação também passa por comunicação à concessionária, porque muda a potência instalada.",
      },
    ],
    related: ["energia-solar-para-empresas", "projeto-e-homologacao"],
  },
];

export const SERVICE_BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));
