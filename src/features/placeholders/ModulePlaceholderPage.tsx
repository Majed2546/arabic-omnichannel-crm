import { PageHeader } from '../../components/layout/PageHeader'
import { AppCard } from '../../components/ui/AppCard'
import { EmptyState } from '../../components/ui/EmptyState'

type ModulePlaceholderPageProps = {
  title: string
  description: string
}

export default function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  return (
    <div className="page-layout">
      <AppCard>
        <PageHeader title={title} description={description} />
        <EmptyState
          title="الصفحة جاهزة للربط"
          message="تم تثبيت المسار في القائمة الرئيسية وسيتم ربطه ببيانات CRM عند تفعيل الوحدة."
        />
      </AppCard>
    </div>
  )
}
