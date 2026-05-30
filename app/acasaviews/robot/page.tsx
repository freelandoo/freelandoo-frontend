import Navbar from "@/features/acasaviews/components/shared/navbar"
import Footer from "@/features/acasaviews/components/shared/footer"

export const metadata = {
  title: "Views Robot - Studio Views",
  description: "Jogue o Views Robot, um jogo interativo desenvolvido pelo Studio Views",
}

export default function RobotPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <section className="relative min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Views Robot
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">Explore o mundo interativo do Views Robot</p>
          </div>

          {/* Game Container */}
          <div className="relative w-full mx-auto bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-800">
            <iframe
              src="https://viewsrobot.netlify.app/"
              className="w-full h-[70vh] md:h-[75vh]"
              frameBorder="0"
              allowFullScreen
              title="Views Robot Game"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>

          {/* Game Info */}
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-1 gap-8">
              <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-lg border border-slate-800">
                <h3 className="text-xl font-bold mb-3 text-purple-400">Sobre o Jogo</h3>
                <p className="text-slate-400 leading-relaxed">
                  Views Robot é uma experiência interativa desenvolvida pelo Studio Views, combinando elementos de
                  exploração e diversão em um ambiente digital único.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
