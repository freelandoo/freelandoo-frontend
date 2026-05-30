"use client"

import type React from "react"

import { useRef, useState } from "react"

interface ParallaxCardProps {
  layers: {
    src: string
    depth: number
  }[]
  alt: string
}

export default function ParallaxCard({ layers, alt }: ParallaxCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    const rotateX = (mouseY / (rect.height / 2)) * -15
    const rotateY = (mouseX / (rect.width / 2)) * 15

    setRotation({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 })
  }

  return (
    <div
      ref={cardRef}
      className="relative w-full h-[600px] perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {layers.map((layer, index) => {
          const translateX = rotation.y * layer.depth * 2
          const translateY = -rotation.x * layer.depth * 2

          return (
            <div
              key={index}
              className="absolute inset-0 w-full h-full"
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${layer.depth * 50}px)`,
                transformStyle: "preserve-3d",
                transition: "transform 0.2s ease-out",
              }}
            >
              <img
                src={layer.src || "/acasaviews/placeholder.svg"}
                alt={`${alt} - layer ${index + 1}`}
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
