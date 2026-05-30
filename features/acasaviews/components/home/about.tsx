"use client"

export default function About() {
  return (
    <section id="about" className="py-20 md:py-32 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-12 text-balance">Sobre nós</h2>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <p className="text-lg text-muted-foreground leading-relaxed">
              O Studio Views é uma empresa-mãe voltada à criação de conteúdo, entretenimento e comunicação estratégica.
              Nascemos com o propósito de unir criatividade, mídia e negócios em um único ecossistema.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Um espaço onde o entretenimento se transforma em audiência, e a audiência se transforma em oportunidade.
              Somos mais do que uma produtora ou agência — somos um hub de marcas, ideias e experiências digitais.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Atuamos na produção de conteúdo para internet, desenvolvimento de marcas, consultoria de marketing,
              prospecção de parceiros e operação de projetos autorais inovadores.
            </p>
          </div>

          <div className="relative h-96 rounded-xl overflow-hidden">
            <img
              src="/acasaviews/studioViews.jpg"
              alt="Studio Views - Our Creative Space"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Conteúdo", desc: "Produção de conteúdo de alta qualidade para internet" },
            { title: "Branding", desc: "Desenvolvimento completo de marcas e identidades visuais" },
            { title: "Consultoria", desc: "Estratégias de marketing e comunicação para crescimento" },
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-colors"
            >
              <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
