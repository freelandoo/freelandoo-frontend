import { CourseWatchView } from "./_components/course-watch-view"

export default async function CourseWatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CourseWatchView courseId={id} />
}
