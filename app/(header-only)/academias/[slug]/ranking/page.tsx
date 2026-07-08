import { AcademyRankingFull } from "./_components/academy-ranking-full"

export default async function AcademyRankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AcademyRankingFull slug={slug} />
}
