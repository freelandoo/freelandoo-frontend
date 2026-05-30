"use client"

import Navbar from "@/features/acasaviews/components/shared/navbar"
import Hero from "@/features/acasaviews/components/home/hero"
import About from "@/features/acasaviews/components/home/about"
import Projects from "@/features/acasaviews/components/home/projects"
import Partnerships from "@/features/acasaviews/components/home/partnerships"
import Contact from "@/features/acasaviews/components/home/contact"
import Footer from "@/features/acasaviews/components/shared/footer"
import { FadeInSection } from "@/features/acasaviews/components/shared/fade-in-section"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-background pt-16">
        <Hero />
        <FadeInSection>
          <About />
        </FadeInSection>
        <FadeInSection>
          <Projects />
        </FadeInSection>
        <FadeInSection>
          <Partnerships />
        </FadeInSection>
        <FadeInSection>
          <Contact />
        </FadeInSection>
        <FadeInSection>
          <Footer />
        </FadeInSection>
      </main>
    </>
  )
}
