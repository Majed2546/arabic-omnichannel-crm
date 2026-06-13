import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit3, Play, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import {
  createAutomationRule,
  deleteAutomationRule,
  fetchAutomationLogs,
  fetchAutomationRules,
  testAutomationRule,
  toggleAutomationRule,
  updateAutomationRule,
  normalizeAutomationActions,
  type AutomationActionType,
  type AutomationActionsInput,
  type AutomationLog,
  type AutomationLogStatus,
  type AutomationRule,
  type AutomationRulePayload,
  type AutomationTriggerType,
} from './automationData'

const triggerLabels: Record<AutomationTriggerType, string> = {
  NEW_MESSAGE: 'رسالة جديدة',
  CONVERSATION_UNASSIGNED: 'محادثة غير مسندة',
  SLA_BREACHED: 'تجاوز SLA',
  APPOINTMENT_CREATED: 'إنشاء موعد',
  APPOINTMENT_DUE_SOON: 'موعد قريب',
  TICKET_CREATED: 'إنشاء تذكرة',
  TICKET_STATUS_CHANGED: 'تغير حالة تذكرة',
}

const actionLabels: Record<AutomationActionType, string> = {
  assign_conversation: 'إسناد محادثة',
  add_tag: 'إضافة وسم',
  create_ticket: 'إنشاء تذكرة',
  send_quick_reply: 'إرسال رد جاهز Placeholder',
  send_template: 'إرسال قالب Placeholder',
  notify_agent: 'تنبيه موظف Placeholder',
}

const logStatusLabels: Record<AutomationLogStatus, string> = {
  SUCCESS: 'نجح',
  FAILED: 'فشل',
  SKIPPED: 'تم التخطي',
}

const templateRules: Array<{
  title: string
  payload: AutomationRulePayload
}> = [
  {
    title: 'عند وصول رسالة جديدة: إنشاء تذكرة',
    payload: {
      name: 'إنشاء تذكرة عند وصول رسالة جديدة',
      description: 'قاعدة أساسية لتجهيز متابعة دعم لكل رسالة جديدة.',
      triggerType: 'NEW_MESSAGE',
      conditions: { channelType: 'WHATSAPP' },
      actions: [{ type: 'create_ticket', label: 'إنشاء تذكرة متابعة' }],
      isActive: true,
    },
  },
  {
    title: 'عند محادثة غير مسندة: إسناد للمستشار',
    payload: {
      name: 'إسناد المحادثات غير المسندة',
      description: 'تجهيز إسناد تلقائي للمحادثات التي لا يوجد عليها مسؤول.',
      triggerType: 'CONVERSATION_UNASSIGNED',
      conditions: { conversationStatus: 'OPEN' },
      actions: [{ type: 'assign_conversation', label: 'إسناد للمستشار' }],
      isActive: false,
    },
  },
  {
    title: 'عند تجاوز SLA: تنبيه المسؤول',
    payload: {
      name: 'تنبيه عند تجاوز SLA',
      description: 'تنبيه Placeholder عند تجاوز وقت الاستجابة المتفق عليه.',
      triggerType: 'SLA_BREACHED',
      conditions: { priority: 'HIGH' },
      actions: [{ type: 'notify_agent', label: 'تنبيه المسؤول' }],
      isActive: true,
    },
  },
  {
    title: 'عند إنشاء موعد: تجهيز رسالة تأكيد',
    payload: {
      name: 'تجهيز رسالة تأكيد موعد',
      description: 'تحضير قالب تأكيد موعد دون إرسال تلقائي في هذا الإصدار.',
      triggerType: 'APPOINTMENT_CREATED',
      conditions: { businessHours: 'placeholder' },
      actions: [{ type: 'send_template', label: 'قالب تأكيد موعد' }],
      isActive: false,
    },
  },
]

type RuleFormState = {
  name: string
  description: string
  triggerType: AutomationTriggerType
  conditionChannelType: string
  conditionCustomerTag: string
  conditionConversationStatus: string
  conditionPriority: string
  businessHours: boolean
  actionType: AutomationActionType
  actionValue: string
  isActive: boolean
}

const emptyForm: RuleFormState = {
  name: '',
  description: '',
  triggerType: 'NEW_MESSAGE',
  conditionChannelType: '',
  conditionCustomerTag: '',
  conditionConversationStatus: '',
  conditionPriority: '',
  businessHours: false,
  actionType: 'create_ticket',
  actionValue: '',
  isActive: true,
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير محدد'
}

function logTone(status?: AutomationLogStatus | null) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'SKIPPED') return 'warning'
  return 'muted'
}

function actionSummary(actions: AutomationActionsInput) {
  const items = normalizeAutomationActions(actions)
  if (!items.length) return 'لا توجد إجراءات'
  return items.map((action) => action.label || actionLabels[action.type] || action.type).join('، ')
}

function toForm(rule: AutomationRule): RuleFormState {
  const conditions = rule.conditions ?? {}
  const action = normalizeAutomationActions(rule.actions)[0] ?? { type: 'create_ticket' as AutomationActionType }
  return {
    name: rule.name,
    description: rule.description ?? '',
    triggerType: rule.triggerType,
    conditionChannelType: String(conditions.channelType ?? ''),
    conditionCustomerTag: String(conditions.customerTag ?? ''),
    conditionConversationStatus: String(conditions.conversationStatus ?? ''),
    conditionPriority: String(conditions.priority ?? ''),
    businessHours: Boolean(conditions.businessHours),
    actionType: action.type,
    actionValue: action.value ?? action.label ?? '',
    isActive: rule.isActive,
  }
}

function toPayload(form: RuleFormState): AutomationRulePayload {
  const conditions: Record<string, unknown> = {}
  if (form.conditionChannelType) conditions.channelType = form.conditionChannelType
  if (form.conditionCustomerTag) conditions.customerTag = form.conditionCustomerTag
  if (form.conditionConversationStatus) conditions.conversationStatus = form.conditionConversationStatus
  if (form.conditionPriority) conditions.priority = form.conditionPriority
  if (form.businessHours) conditions.businessHours = 'placeholder'

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    triggerType: form.triggerType,
    conditions,
    actions: [{ type: form.actionType, label: actionLabels[form.actionType], value: form.actionValue.trim() || undefined }],
    isActive: form.isActive,
  }
}

function RuleModal({
  editingRule,
  form,
  onChange,
  onClose,
  onSubmit,
}: {
  editingRule: AutomationRule | null
  form: RuleFormState
  onChange: (form: RuleFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <form className="customer-modal automation-modal panel-panel" role="dialog" aria-modal="true" aria-label="قاعدة أتمتة" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-header split-header">
          <div>
            <h2>{editingRule ? 'تعديل قاعدة أتمتة' : 'إنشاء قاعدة أتمتة'}</h2>
            <p>إجراءات الإرسال والتنبيه تبقى Placeholder في هذا الإصدار ولا ترسل رسائل واتساب تلقائيًا.</p>
          </div>
          <AppButton type="button" variant="ghost" className="customer-modal-close" aria-label="إغلاق" onClick={onClose}>
            <X size={18} />
          </AppButton>
        </div>

        <div className="automation-form-grid">
          <label className="automation-form-wide">
            <span>اسم القاعدة</span>
            <AppInput autoFocus required value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
          </label>
          <label className="automation-form-wide">
            <span>الوصف</span>
            <textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
          </label>
          <label>
            <span>المحفز</span>
            <AppSelect value={form.triggerType} onChange={(event) => onChange({ ...form, triggerType: event.target.value as AutomationTriggerType })}>
              {Object.entries(triggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>الإجراء</span>
            <AppSelect value={form.actionType} onChange={(event) => onChange({ ...form, actionType: event.target.value as AutomationActionType })}>
              {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>قناة المحادثة</span>
            <AppSelect value={form.conditionChannelType} onChange={(event) => onChange({ ...form, conditionChannelType: event.target.value })}>
              <option value="">أي قناة</option>
              <option value="WHATSAPP">واتساب</option>
              <option value="EMAIL">البريد الإلكتروني</option>
              <option value="WEBCHAT">دردشة الموقع</option>
              <option value="INSTAGRAM">إنستغرام</option>
              <option value="SMS">رسائل SMS</option>
            </AppSelect>
          </label>
          <label>
            <span>وسم العميل</span>
            <AppInput value={form.conditionCustomerTag} placeholder="VIP" onChange={(event) => onChange({ ...form, conditionCustomerTag: event.target.value })} />
          </label>
          <label>
            <span>حالة المحادثة</span>
            <AppInput value={form.conditionConversationStatus} placeholder="OPEN / SLA_BREACHED" onChange={(event) => onChange({ ...form, conditionConversationStatus: event.target.value })} />
          </label>
          <label>
            <span>الأولوية</span>
            <AppSelect value={form.conditionPriority} onChange={(event) => onChange({ ...form, conditionPriority: event.target.value })}>
              <option value="">أي أولوية</option>
              <option value="LOW">منخفضة</option>
              <option value="NORMAL">عادية</option>
              <option value="HIGH">عالية</option>
              <option value="URGENT">عاجلة</option>
              <option value="VIP">VIP</option>
            </AppSelect>
          </label>
          <label>
            <span>قيمة الإجراء</span>
            <AppInput value={form.actionValue} placeholder="اختياري" onChange={(event) => onChange({ ...form, actionValue: event.target.value })} />
          </label>
          <label className="automation-toggle">
            <input type="checkbox" checked={form.businessHours} onChange={(event) => onChange({ ...form, businessHours: event.target.checked })} />
            <span>ساعات العمل Placeholder</span>
          </label>
          <label className="automation-toggle">
            <input type="checkbox" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} />
            <span>تفعيل القاعدة</span>
          </label>
        </div>

        <div className="form-actions">
          <AppButton type="button" variant="ghost" onClick={onClose}>إلغاء</AppButton>
          <AppButton type="submit" variant="primary" disabled={!form.name.trim()}>{editingRule ? 'حفظ التعديلات' : 'إنشاء القاعدة'}</AppButton>
        </div>
      </form>
    </div>
  )
}

export default function WorkflowsPage() {
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('automation.manage')
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [triggerFilter, setTriggerFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [form, setForm] = useState<RuleFormState>(emptyForm)
  const [isLoading, setLoading] = useState(true)

  const activeRulesCount = useMemo(() => rules.filter((rule) => rule.isActive).length, [rules])

  function refreshRules() {
    if (!currentTenantId) return
    setLoading(true)
    fetchAutomationRules({ triggerType: triggerFilter, isActive: activeFilter })
      .then(setRules)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل قواعد الأتمتة', 'warning'))
      .finally(() => setLoading(false))
  }

  function refreshLogs() {
    if (!currentTenantId) return
    fetchAutomationLogs({})
      .then(setLogs)
      .catch(() => setLogs([]))
  }

  useEffect(() => {
    refreshRules()
  }, [currentTenantId, triggerFilter, activeFilter])

  useEffect(() => {
    refreshLogs()
  }, [currentTenantId])

  function openCreate(payload?: AutomationRulePayload) {
    setEditingRule(null)
    setForm(payload ? {
      ...emptyForm,
      name: payload.name,
      description: payload.description ?? '',
      triggerType: payload.triggerType,
      conditionChannelType: String(payload.conditions?.channelType ?? ''),
      conditionCustomerTag: String(payload.conditions?.customerTag ?? ''),
      conditionConversationStatus: String(payload.conditions?.conversationStatus ?? ''),
      conditionPriority: String(payload.conditions?.priority ?? ''),
      businessHours: Boolean(payload.conditions?.businessHours),
      actionType: normalizeAutomationActions(payload.actions)[0]?.type ?? 'create_ticket',
      actionValue: normalizeAutomationActions(payload.actions)[0]?.value ?? normalizeAutomationActions(payload.actions)[0]?.label ?? '',
      isActive: payload.isActive ?? true,
    } : emptyForm)
    setModalOpen(true)
  }

  function openEdit(rule: AutomationRule) {
    setEditingRule(rule)
    setForm(toForm(rule))
    setModalOpen(true)
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (editingRule) await updateAutomationRule(editingRule.id, toPayload(form))
      else await createAutomationRule(toPayload(form))
      setModalOpen(false)
      setEditingRule(null)
      refreshRules()
      showToast(editingRule ? 'تم تحديث قاعدة الأتمتة' : 'تم إنشاء قاعدة الأتمتة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ قاعدة الأتمتة', 'warning')
    }
  }

  async function toggleRule(rule: AutomationRule) {
    try {
      await toggleAutomationRule(rule.id, !rule.isActive)
      refreshRules()
      showToast(rule.isActive ? 'تم إيقاف القاعدة' : 'تم تفعيل القاعدة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تغيير حالة القاعدة', 'warning')
    }
  }

  async function testRule(rule: AutomationRule) {
    try {
      await testAutomationRule(rule.id)
      refreshRules()
      refreshLogs()
      showToast('تم تنفيذ اختبار آمن وتسجيل النتيجة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر اختبار القاعدة', 'warning')
    }
  }

  async function removeRule(rule: AutomationRule) {
    if (!window.confirm('هل تريد حذف قاعدة الأتمتة؟')) return
    try {
      await deleteAutomationRule(rule.id)
      refreshRules()
      showToast('تم حذف قاعدة الأتمتة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف القاعدة', 'warning')
    }
  }

  return (
    <div className="page-layout workflows-page automation-page">
      <PageHeader
        title="الأتمتة"
        description="قواعد تشغيل أساسية لتقليل العمل اليدوي في خدمة العملاء، بدون تنفيذ إرسال تلقائي فعلي في هذا الإصدار."
        actions={canManage ? (
          <AppButton variant="primary" onClick={() => openCreate()}>
            <Plus size={16} /> إنشاء قاعدة
          </AppButton>
        ) : null}
      />

      <div className="inactive-tenant-banner soft-warning automation-notice">
        الأتمتة في هذا الإصدار تعمل كقواعد تشغيل أساسية، وبعض الإجراءات Placeholder لحين ربط الإرسال التلقائي.
      </div>

      <section className="automation-summary-grid">
        <AppCard><strong>{rules.length.toLocaleString('ar-SA')}</strong><span>قواعد محفوظة</span></AppCard>
        <AppCard><strong>{activeRulesCount.toLocaleString('ar-SA')}</strong><span>قواعد مفعلة</span></AppCard>
        <AppCard><strong>{logs.length.toLocaleString('ar-SA')}</strong><span>آخر سجلات التنفيذ</span></AppCard>
      </section>

      <AppCard className="automation-templates">
        <div className="panel-header split-header">
          <div>
            <h2>قوالب شائعة</h2>
            <p>ابدأ بقاعدة جاهزة ثم عدّل تفاصيلها حسب سياق الشركة.</p>
          </div>
        </div>
        <div className="automation-template-grid">
          {templateRules.map((template) => (
            <button key={template.title} type="button" onClick={() => openCreate(template.payload)}>
              <strong>{template.title}</strong>
              <span>{triggerLabels[template.payload.triggerType]} · {actionSummary(template.payload.actions)}</span>
            </button>
          ))}
        </div>
      </AppCard>

      <AppCard className="automation-filters">
        <AppSelect value={triggerFilter} onChange={(event) => setTriggerFilter(event.target.value)}>
          <option value="">كل المحفزات</option>
          {Object.entries(triggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
          <option value="">كل الحالات</option>
          <option value="true">مفعلة</option>
          <option value="false">متوقفة</option>
        </AppSelect>
      </AppCard>

      {isLoading ? <EmptyState title="جار تحميل قواعد الأتمتة" message="نجهّز القواعد الحالية للشركة." /> : null}
      {!isLoading && !rules.length ? <EmptyState title="لا توجد قواعد أتمتة" message="أنشئ قاعدة جديدة أو استخدم أحد القوالب الشائعة." /> : null}

      <section className="automation-rule-grid">
        {rules.map((rule) => (
          <article key={rule.id} className="automation-rule-card panel-panel">
            <header>
              <div>
                <h2>{rule.name}</h2>
                <p>{rule.description || 'لا يوجد وصف.'}</p>
              </div>
              <StatusBadge label={rule.isActive ? 'مفعلة' : 'متوقفة'} tone={rule.isActive ? 'success' : 'muted'} />
            </header>
            <dl className="meta-list automation-rule-meta">
              <div><dt>المحفز</dt><dd>{triggerLabels[rule.triggerType]}</dd></div>
              <div><dt>الإجراءات</dt><dd>{actionSummary(rule.actions)}</dd></div>
              <div><dt>آخر تشغيل</dt><dd>{formatDate(rule.lastRunAt)}</dd></div>
              <div><dt>نتيجة آخر تشغيل</dt><dd><StatusBadge label={rule.lastRunStatus ? logStatusLabels[rule.lastRunStatus] : 'لا يوجد'} tone={logTone(rule.lastRunStatus)} /></dd></div>
            </dl>
            <div className="automation-condition-preview">
              <strong>الشروط</strong>
              <span>{Object.keys(rule.conditions ?? {}).length ? JSON.stringify(rule.conditions) : 'بدون شروط محددة'}</span>
            </div>
            <footer className="automation-actions">
              {canManage ? <AppButton variant="ghost" onClick={() => openEdit(rule)}><Edit3 size={15} /> تعديل</AppButton> : null}
              {canManage ? <AppButton variant="ghost" onClick={() => toggleRule(rule)}>{rule.isActive ? 'إيقاف' : 'تفعيل'}</AppButton> : null}
              {canManage ? <AppButton variant="ghost" onClick={() => testRule(rule)}><Play size={15} /> اختبار</AppButton> : null}
              {canManage ? <AppButton variant="ghost" onClick={() => removeRule(rule)}><Trash2 size={15} /> حذف</AppButton> : null}
            </footer>
          </article>
        ))}
      </section>

      <AppCard className="automation-logs-panel">
        <div className="panel-header split-header">
          <div>
            <h2>سجل التنفيذ</h2>
            <p>آخر الاختبارات أو عمليات التنفيذ الآمنة المسجلة ضمن المستأجر الحالي.</p>
          </div>
        </div>
        <div className="automation-log-list">
          {logs.map((log) => (
            <article key={log.id}>
              <StatusBadge label={logStatusLabels[log.status]} tone={logTone(log.status)} />
              <div>
                <strong>{log.ruleName || 'قاعدة محذوفة'}</strong>
                <small>{triggerLabels[log.triggerType]} · {log.targetType} · {formatDate(log.createdAt)}</small>
                <p>{log.message || 'لا توجد تفاصيل إضافية.'}</p>
              </div>
            </article>
          ))}
          {!logs.length ? <EmptyState title="لا توجد سجلات تنفيذ" message="اختبر قاعدة لإظهار سجل آمن هنا." /> : null}
        </div>
      </AppCard>

      {modalOpen ? (
        <RuleModal
          editingRule={editingRule}
          form={form}
          onChange={setForm}
          onClose={() => { setModalOpen(false); setEditingRule(null) }}
          onSubmit={saveRule}
        />
      ) : null}
    </div>
  )
}
