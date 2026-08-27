import { permanentRedirect } from 'next/navigation'

export default async function LegacyLogframePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  permanentRedirect(`/projects/${id}/logframe`)
}
