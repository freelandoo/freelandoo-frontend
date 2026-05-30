"use client"

import type React from "react"

import { Button } from "@/features/acasaviews/components/ui/button"
import { useState } from "react"

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Handle form submission here
  }

  return (
    <section id="contact" className="py-20 md:py-32 px-6 bg-slate-950/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">Contato para parcerias</h2>
        <p className="text-muted-foreground text-lg mb-16">Vamos conversar sobre suas ideias e oportunidades</p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-16">
          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="Seu nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-6 py-4 rounded-lg bg-slate-900/50 border border-purple-500/20 text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
            <input
              type="email"
              placeholder="Seu e-mail"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="px-6 py-4 rounded-lg bg-slate-900/50 border border-purple-500/20 text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>

          <input
            type="text"
            placeholder="Sua empresa"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-6 py-4 rounded-lg bg-slate-900/50 border border-purple-500/20 text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
          />

          <textarea
            placeholder="Sua mensagem"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={6}
            className="w-full px-6 py-4 rounded-lg bg-slate-900/50 border border-purple-500/20 text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
          ></textarea>

          <div className="flex justify-center">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full px-12">
              Enviar mensagem
            </Button>
          </div>
        </form>

        <div className="grid md:grid-cols-2 gap-12 pt-16 border-t border-purple-500/20">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Redes sociais</h3>
            <ul className="space-y-3 text-muted-foreground">
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
              <li>
                <a  href="https://www.youtube.com/@AGORAMONEY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors"
                >
                  YouTube
                </a>
              </li>
              <li>
                <a  href="https://www.tiktok.com/@arussamaisrussa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors">
                  TikTok
                </a>
              </li>
              <li>
                <a  href="https://k.kwai.com/u/@arussamaisrussa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors">
                  Kwai
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Contato direto</h3>
            <p className="text-muted-foreground mb-2">
              <a href="mailto:contato@studioviews.com" className="hover:text-cyan-400 transition-colors">
                contato@studioviews.com
              </a>
            </p>
            <p className="text-muted-foreground">
              <a href="mailto:parcerias@studioviews.com" className="hover:text-cyan-400 transition-colors">
                parcerias@studioviews.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
