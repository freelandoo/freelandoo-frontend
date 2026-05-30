"use client"

import { Button } from "@/features/acasaviews/components/ui/button"

export default function Partnerships() {
  const partners = [
    {
      title:"@arussamaisrussa",
      link:"https://www.instagram.com/arussamaisrussa/"
    },
    {
      title:"Partner 2",
      link:"https://www.instagram.com/arussamaisrussa/"
    },
    {
      title:"Partner 3",
      link:"https://www.instagram.com/arussamaisrussa/"
    },
    {
      title:"Partner 4",
      link:"https://www.instagram.com/arussamaisrussa/"
    }]

  return (
    <section id="partnerships" className="py-20 md:py-32 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">Parcerias & Licenciamento</h2>
        <p className="text-muted-foreground text-lg mb-16 max-w-2xl">
          Colaboramos com marcas e criadores para transformar ideias em oportunidades de crescimento mútuo
        </p>

        <div className="mb-20">
          <p className="text-muted-foreground mb-12 text-lg leading-relaxed">
            O Studio Views atua como um ecossistema aberto, conectando marcas, criadores e experiências. Através de
            parcerias estratégicas, licenciamento e projetos colaborativos, ajudamos nossos parceiros a alcançar novos
            públicos e oportunidades.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-16">
            {partners.map((partner, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20 flex items-center justify-center hover:border-cyan-400/50 transition-colors"
              >
                <p className="text-muted-foreground text-center text-sm font-medium">{partner.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Quer fazer parte do nosso ecossistema?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Conecte-se conosco e explore as infinitas possibilidades de colaboração e crescimento
          </p>
          <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold rounded-full px-8">
            Entrar em contato
          </Button>
        </div>
      </div>
    </section>
  )
}
