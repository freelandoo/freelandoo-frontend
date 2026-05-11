import { ModuleLandingView } from "./_components/module-landing-view"

export default async function ManageModulePage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>
}) {
  const { id, moduleId } = await params
  return <ModuleLandingView courseId={id} moduleId={moduleId} />
}
