import Link from 'next/link'
import { Plus, FileUp } from 'lucide-react'
import { LamaranList } from '@/components/lamaran-list'
import { getSources } from '@/lib/queries'
import { PageHeader } from '@/components/page-header'
import { getServerLang } from '@/lib/server-lang'
import { getDict } from '@/lib/i18n'

export default async function LamaranPage() {
  const sources = await getSources()
  const t = getDict(await getServerLang())

  return (
    <main className="p-4">
      <PageHeader title={t['lamaran.title']} description={t['lamaran.desc']}>
        <Link href="/lamaran/import" className="btn-secondary">
          <FileUp size={16} /> {t['dashboard.import']}
        </Link>
        <Link href="/lamaran/baru" className="btn-primary">
          <Plus size={16} /> {t['dashboard.add']}
        </Link>
      </PageHeader>
      <LamaranList variant="full" sources={sources} />
    </main>
  )
}
