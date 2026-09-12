// O fundo do tema: preto profundo com brasa dourada, sopro vermelho no alto e
// um azul frio embaixo — as três cores do banner.
//
// ⚠️ ISTO ERA UM SHADER WebGPU NO PROJETO DE ORIGEM, E NÃO VOLTA A SER.
// A plataforma já pagou essa conta em 2026-09-09 e a lição está escrita: o
// custo de um shader de tela cheia é POR PIXEL, então quem paga é o tamanho da
// JANELA, não o aparelho — num monitor grande a conta nunca fecha. E o pior
// não é o fundo ficar caro: é que ele divide a GPU com o COMPOSITOR, então
// quem engasga é a rolagem da página inteira, e a causa parece estar em
// qualquer outro lugar. Foi assim que "os pills estão travando" custou três
// investigações antes de alguém olhar para o papel de parede.
//
// A regra que ficou vale aqui igual: NADA DE ANIMAÇÃO NUMA CAMADA DO TAMANHO
// DA JANELA. Se um dia este tema precisar de vida, ela tem que caber num
// elemento pequeno — um selo, um chip —, nunca no fundo.
//
// O que sobrou é o que sempre foi o caminho de reserva do shader: gradientes
// em CSS, pintados UMA vez. Depois disso a camada é apenas composta, e rolar a
// página custa zero de GPU aqui. O desenho é o mesmo; o que morreu foi o
// movimento — e num site que é quase todo texto rolado, ele nunca foi visto.
//
// Componente de SERVIDOR: sem estado, sem efeito, sem `"use client"`. Ele
// entrega duas `<div>` e não tem por que custar um chunk de JavaScript.

export default function TechBackdrop() {
  return (
    <>
      {/* A cor de fundo. `fixed` para não rolar com o conteúdo, e sem z-index:
          quem vem depois no DOM pinta por cima — a mesma ordem de pintura que
          o `.fx-layer` do conteúdo conta. */}
      <div aria-hidden className="fx-backdrop-css fx-grain" />

      {/* Os arcos concêntricos do banner, rebaixados: aqui eles são textura de
          fundo, não assinatura — quem assina são os arcos das seções. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 8%, rgba(243,183,63,.05) 0px, rgba(243,183,63,.05) 1px, transparent 1px, transparent 96px)",
          maskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 100%)",
        }}
      />
    </>
  )
}
