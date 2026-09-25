// O OBJETO DE IDENTIDADE: uma lâmina estilizada em 3D, feita de CSS.
//
// Três planos em profundidade (`translateZ`) com metal escovado e o fio verde
// no meio — o suficiente para ler como objeto girando, sem canvas nenhum. Um
// Three.js inteiro para um prisma que gira seria centenas de KB para o que
// quatro divs e `preserve-3d` fazem de graça, e o briefing pede "a solução
// menos custosa capaz de produzir o efeito".
//
// Ela aparece no hero e volta no fechamento: é a continuidade visual entre a
// primeira e a última cena. O invólucro recebe a inclinação do cursor (JS); a
// lâmina gira sozinha por CSS — as duas transformações ficam em elementos
// diferentes para não se sobrescreverem.

export function Blade({ className = "" }: { className?: string }) {
  return (
    <div className={`blade-stage ${className}`} aria-hidden="true">
      <div className="h-full w-full" data-blade-tilt>
        <div className="blade">
          <div className="blade-face" style={{ transform: "translateZ(-10px)", opacity: 0.55 }} />
          <div className="blade-face" style={{ transform: "translateZ(0px)" }} />
          <div className="blade-face edge" style={{ transform: "translateZ(1px)" }} />
          <div className="blade-face" style={{ transform: "translateZ(10px)", opacity: 0.35 }} />
        </div>
      </div>
    </div>
  );
}
