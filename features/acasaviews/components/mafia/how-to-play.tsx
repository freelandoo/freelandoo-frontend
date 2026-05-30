"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"

export default function HowToPlay() {
  const ref = useFadeIn()

  const steps = [
    {
      phase: "Preparação",
      steps: [
        "Distribua os papéis secretamente para cada jogador",
        "Todos fecham os olhos para começar a primeira noite",
        "O narrador conduz o jogo e mantém a ordem",
      ],
    },
    {
      phase: "Fase Noturna",
      steps: [
        "A Máfia acorda silenciosamente e escolhe uma vítima",
        "O Detetive acorda e investiga um jogador",
        "O Médico acorda e escolhe alguém para proteger",
        "Todos voltam a dormir",
      ],
    },
    {
      phase: "Fase Diurna",
      steps: [
        "Todos acordam e descobrem quem foi eliminado",
        "Discussão aberta: acuse, defenda-se e debata",
        "Votação: todos votam em quem acham suspeito",
        "O jogador mais votado é eliminado",
      ],
    },
    {
      phase: "Vitória",
      steps: [
        "Cidade vence se eliminar todos os mafiosos",
        "Máfia vence se igualar ou superar o número de cidadãos",
        "O jogo continua até um dos lados vencer",
      ],
    },
  ]

  return (
    <section id="como-jogar" ref={ref} className="py-24 bg-gradient-to-b from-slate-950 to-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">Como Jogar</h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto text-pretty">
            O jogo segue uma estrutura simples que se repete até um dos times vencer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((section, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-xl border border-slate-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-xl">
                  {index + 1}
                </div>
                <h3 className="text-2xl font-bold text-white">{section.phase}</h3>
              </div>
              <ul className="space-y-3">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="text-red-600 mt-1">→</span>
                    <span className="text-pretty">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-red-950 to-slate-950 p-8 rounded-xl border border-red-900">
          <h3 className="text-2xl font-bold text-white mb-4">Dicas Importantes</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Preste atenção no comportamento e argumentos de todos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Mafiosos devem agir como cidadãos durante o dia</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Papéis especiais devem usar informações com sabedoria</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">•</span>
              <span>Comunicação e persuasão são fundamentais</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
