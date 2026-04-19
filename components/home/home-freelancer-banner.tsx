import Link from "next/link"

export function HomeFreelancerBanner() {
  return (
    <section className="border-b border-border bg-white py-4 text-center text-sm text-neutral-700 md:text-base">
      <p>
        Você é um freelancer? Junte-se a nós!{" "}
        <Link href="/cadastro" className="font-semibold text-primary hover:underline">
          Cadastre-se.
        </Link>
      </p>
    </section>
  )
}
