"use client"

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-purple-500/20 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-foreground font-semibold mb-4">Studio Views</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Sobre
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Projetos
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Parcerias
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4">Soluções</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Produção
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Branding
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Consultoria
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Termos
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4">Contato</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <a href="mailto:contato@studioviews.com" className="hover:text-cyan-400 transition-colors">
                  E-mail
                </a>
              </li>
 

              <li>
                <a
                  href="https://www.instagram.com/studioviews.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-purple-500/20 pt-8 flex flex-col md:flex-row justify-between items-center text-muted-foreground text-sm">
          <p>© 2025 Studio Views — Todos os direitos reservados</p>
          <p>Criatividade, Mídia e Negócios em Harmonia</p>
        </div>
      </div>
    </footer>
  )
}
