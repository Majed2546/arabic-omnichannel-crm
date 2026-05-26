import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit3, Plus, Send, ToggleLeft, ToggleRight } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useUiStore } from '../../stores/uiStore'
import { useTenant } from '../../tenants/useTenant'
import { getChannelLabel } from '../../shared/utils'
import {
  createQuickReply,
  createWhatsAppTemplate,
  fetchQuickReplies,
  fetchWhatsAppTemplates,
  setQuickReplyActive,
  submitWhatsAppTemplate,
  updateQuickReply,
  updateWhatsAppTemplate,
  type QuickReply,
  type QuickReplyPayload,
  type WhatsAppTemplate,
  type WhatsAppTemplatePayload,
  type WhatsAppTemplateStatus,
} from './templateData'

const templateStatusLabels: Record<WhatsAppTemplateStatus, string> = {
  DRAFT: 'مسودة',
  PENDING_REVIEW: 'قيد المراجعة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
}

const quickReplyInitial: QuickReplyPayload = {
  title: '',
  content: '',
  category: '',
  channelType: '',
  isActive: true,
}

const templateInitial: WhatsAppTemplatePayload = {
  name: '',
  language: 'ar',
  category: 'UTILITY',
  body: '',
  variables: [],
}

function statusTone(status: WhatsAppTemplateStatus) {
  if (status === 'APPROVED') return 'success'
  if (status === 'PENDING_REVIEW') return 'warning'
  if (status === 'REJECTED') return 'danger'
  return 'muted'
}

function extractVariables(body: string) {
  return Array.from(new Set(Array.from(body.matchAll(/\{\{\s*([\w\u0600-\u06FF.-]+)\s*\}\}/g)).map((match) => match[1])))
}

export default function TemplatesPage() {
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('templates.manage')
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [quickSearch, setQuickSearch] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('true')
  const [templateFilter, setTemplateFilter] = useState('')
  const [quickForm, setQuickForm] = useState<QuickReplyPayload>(quickReplyInitial)
  const [templateForm, setTemplateForm] = useState<WhatsAppTemplatePayload>(templateInitial)
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null)
  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  function refreshQuickReplies() {
    fetchQuickReplies({ search: quickSearch, isActive: quickFilter })
      .then(setQuickReplies)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل الردود الجاهزة', 'warning'))
  }

  function refreshTemplates() {
    fetchWhatsAppTemplates({ search: templateSearch, status: templateFilter })
      .then(setTemplates)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل قوالب واتساب', 'warning'))
  }

  useEffect(() => {
    if (!currentTenantId) return
    refreshQuickReplies()
  }, [currentTenantId, quickSearch, quickFilter])

  useEffect(() => {
    if (!currentTenantId) return
    refreshTemplates()
  }, [currentTenantId, templateSearch, templateFilter])

  const templateVariables = useMemo(() => extractVariables(templateForm.body), [templateForm.body])

  function openQuickModal(reply?: QuickReply) {
    setEditingQuickReply(reply ?? null)
    setQuickForm(reply ? {
      title: reply.title,
      content: reply.content,
      category: reply.category ?? '',
      channelType: reply.channelType ?? '',
      isActive: reply.isActive,
    } : quickReplyInitial)
    setQuickModalOpen(true)
  }

  function openTemplateModal(template?: WhatsAppTemplate) {
    setEditingTemplate(template ?? null)
    setTemplateForm(template ? {
      name: template.name,
      language: template.language,
      category: template.category,
      body: template.body,
      variables: template.variables,
    } : templateInitial)
    setTemplateModalOpen(true)
  }

  async function saveQuickReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { ...quickForm, channelType: quickForm.channelType || undefined }
    try {
      if (editingQuickReply) await updateQuickReply(editingQuickReply.id, payload)
      else await createQuickReply(payload)
      setQuickModalOpen(false)
      refreshQuickReplies()
      showToast('تم حفظ الرد الجاهز', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الرد الجاهز', 'warning')
    }
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { ...templateForm, variables: templateVariables }
    try {
      if (editingTemplate) await updateWhatsAppTemplate(editingTemplate.id, payload)
      else await createWhatsAppTemplate(payload)
      setTemplateModalOpen(false)
      refreshTemplates()
      showToast('تم حفظ قالب واتساب كمسودة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ القالب', 'warning')
    }
  }

  async function toggleQuickReply(reply: QuickReply) {
    try {
      await setQuickReplyActive(reply.id, !reply.isActive)
      refreshQuickReplies()
      showToast(reply.isActive ? 'تم تعطيل الرد الجاهز' : 'تم تفعيل الرد الجاهز', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تغيير حالة الرد', 'warning')
    }
  }

  async function submitTemplate(template: WhatsAppTemplate) {
    try {
      await submitWhatsAppTemplate(template.id)
      refreshTemplates()
      showToast('تم نقل القالب إلى حالة قيد المراجعة كتجهيز مبدئي. الربط الحقيقي مع Meta لاحقًا.', 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إرسال القالب للمراجعة', 'warning')
    }
  }

  return (
    <div className="page-layout templates-page">
      <PageHeader
        title="الردود الجاهزة وقوالب واتساب"
        description="إدارة عبارات الفريق اليومية وقوالب واتساب المعتمدة مستقبلاً لكل شركة."
        actions={canManage ? (
          <>
            <AppButton variant="secondary" onClick={() => openQuickModal()}><Plus size={16} /> رد جاهز</AppButton>
            <AppButton variant="primary" onClick={() => openTemplateModal()}><Plus size={16} /> قالب واتساب</AppButton>
          </>
        ) : null}
      />

      <section className="templates-section">
        <AppCard className="templates-toolbar">
          <div>
            <h2>الردود الجاهزة</h2>
            <p>عبارات قابلة للإدراج في صندوق الوارد قبل الإرسال.</p>
          </div>
          <AppInput type="search" value={quickSearch} placeholder="بحث في الردود الجاهزة" onChange={(event) => setQuickSearch(event.target.value)} />
          <AppSelect value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)}>
            <option value="">كل الحالات</option>
            <option value="true">مفعلة</option>
            <option value="false">معطلة</option>
          </AppSelect>
        </AppCard>

        <div className="template-card-grid">
          {quickReplies.map((reply) => (
            <article key={reply.id} className="template-item-card">
              <header>
                <div>
                  <h3>{reply.title}</h3>
                  <p>{reply.category || 'عام'} · {getChannelLabel(reply.channelType)}</p>
                </div>
                <StatusBadge label={reply.isActive ? 'مفعل' : 'معطل'} tone={reply.isActive ? 'success' : 'muted'} />
              </header>
              <p className="template-body-preview">{reply.content}</p>
              {canManage ? (
                <div className="template-actions">
                  <AppButton variant="ghost" onClick={() => openQuickModal(reply)}><Edit3 size={15} /> تعديل</AppButton>
                  <AppButton variant="ghost" onClick={() => toggleQuickReply(reply)}>
                    {reply.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {reply.isActive ? 'تعطيل' : 'تفعيل'}
                  </AppButton>
                </div>
              ) : null}
            </article>
          ))}
          {!quickReplies.length ? <EmptyState title="لا توجد ردود جاهزة" message="أنشئ أول رد جاهز ليستخدمه الفريق من صندوق الوارد." /> : null}
        </div>
      </section>

      <section className="templates-section">
        <AppCard className="templates-toolbar">
          <div>
            <h2>قوالب واتساب</h2>
            <p>مسودات القوالب وتجهيزها للمراجعة. الإرسال عبر Meta غير مفعل بعد.</p>
          </div>
          <AppInput type="search" value={templateSearch} placeholder="بحث في قوالب واتساب" onChange={(event) => setTemplateSearch(event.target.value)} />
          <AppSelect value={templateFilter} onChange={(event) => setTemplateFilter(event.target.value)}>
            <option value="">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="PENDING_REVIEW">قيد المراجعة</option>
            <option value="APPROVED">معتمد</option>
            <option value="REJECTED">مرفوض</option>
          </AppSelect>
        </AppCard>

        <div className="template-card-grid">
          {templates.map((template) => (
            <article key={template.id} className="template-item-card">
              <header>
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.category} · {template.language} · {getChannelLabel(template.channelType)}</p>
                </div>
                <StatusBadge label={templateStatusLabels[template.status]} tone={statusTone(template.status)} />
              </header>
              <p className="template-body-preview">{template.body}</p>
              {template.variables.length ? <small>المتغيرات: {template.variables.join('، ')}</small> : null}
              {template.rejectionReason ? <small>سبب الرفض: {template.rejectionReason}</small> : null}
              {canManage ? (
                <div className="template-actions">
                  <AppButton variant="ghost" disabled={template.status !== 'DRAFT'} onClick={() => openTemplateModal(template)}><Edit3 size={15} /> تعديل</AppButton>
                  <AppButton variant="ghost" disabled={template.status !== 'DRAFT'} onClick={() => submitTemplate(template)}><Send size={15} /> إرسال للمراجعة</AppButton>
                </div>
              ) : null}
            </article>
          ))}
          {!templates.length ? <EmptyState title="لا توجد قوالب واتساب" message="أنشئ مسودة قالب لاستخدامها بعد اعتماد الربط مع Meta." /> : null}
        </div>
      </section>

      {quickModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="customer-modal panel-panel" onSubmit={saveQuickReply}>
            <div className="panel-header split-header">
              <div><h2>{editingQuickReply ? 'تعديل رد جاهز' : 'إنشاء رد جاهز'}</h2><p>سيظهر الرد للفريق داخل صندوق الوارد.</p></div>
              <AppButton variant="ghost" onClick={() => setQuickModalOpen(false)}>إغلاق</AppButton>
            </div>
            <div className="customer-form-grid">
              <label><span>العنوان</span><AppInput autoFocus required value={quickForm.title} onChange={(event) => setQuickForm({ ...quickForm, title: event.target.value })} /></label>
              <label><span>التصنيف</span><AppInput value={quickForm.category} onChange={(event) => setQuickForm({ ...quickForm, category: event.target.value })} /></label>
              <label><span>القناة</span><AppSelect value={quickForm.channelType} onChange={(event) => setQuickForm({ ...quickForm, channelType: event.target.value })}><option value="">كل القنوات</option><option value="WHATSAPP">واتساب</option><option value="EMAIL">البريد الإلكتروني</option><option value="WEBCHAT">دردشة الموقع</option></AppSelect></label>
              <label><span>الحالة</span><AppSelect value={quickForm.isActive ? 'true' : 'false'} onChange={(event) => setQuickForm({ ...quickForm, isActive: event.target.value === 'true' })}><option value="true">مفعل</option><option value="false">معطل</option></AppSelect></label>
              <label className="customer-form-wide"><span>المحتوى</span><textarea required value={quickForm.content} onChange={(event) => setQuickForm({ ...quickForm, content: event.target.value })} /></label>
            </div>
            <div className="form-actions"><AppButton variant="ghost" onClick={() => setQuickModalOpen(false)}>إلغاء</AppButton><AppButton type="submit" variant="primary">حفظ الرد</AppButton></div>
          </form>
        </div>
      ) : null}

      {templateModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="customer-modal panel-panel" onSubmit={saveTemplate}>
            <div className="panel-header split-header">
              <div><h2>{editingTemplate ? 'تعديل قالب واتساب' : 'إنشاء مسودة قالب واتساب'}</h2><p>استخدم المتغيرات بصيغة {'{{name}'}. سيتم استخراجها تلقائيًا.</p></div>
              <AppButton variant="ghost" onClick={() => setTemplateModalOpen(false)}>إغلاق</AppButton>
            </div>
            <div className="customer-form-grid">
              <label><span>اسم القالب</span><AppInput autoFocus required value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} /></label>
              <label><span>اللغة</span><AppInput required value={templateForm.language} onChange={(event) => setTemplateForm({ ...templateForm, language: event.target.value })} /></label>
              <label><span>التصنيف</span><AppSelect value={templateForm.category} onChange={(event) => setTemplateForm({ ...templateForm, category: event.target.value })}><option value="UTILITY">خدمي</option><option value="MARKETING">تسويقي</option><option value="AUTHENTICATION">مصادقة</option></AppSelect></label>
              <label className="customer-form-wide"><span>نص القالب</span><textarea required value={templateForm.body} onChange={(event) => setTemplateForm({ ...templateForm, body: event.target.value })} /></label>
            </div>
            <div className="template-variable-preview">المتغيرات: {templateVariables.length ? templateVariables.join('، ') : 'لا توجد'}</div>
            <div className="form-actions"><AppButton variant="ghost" onClick={() => setTemplateModalOpen(false)}>إلغاء</AppButton><AppButton type="submit" variant="primary">حفظ المسودة</AppButton></div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
