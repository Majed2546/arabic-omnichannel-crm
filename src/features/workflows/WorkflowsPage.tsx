import { useEffect, useMemo, useState } from 'react'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppSelect } from '../../components/ui/AppSelect'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUiStore } from '../../stores/uiStore'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import {
  workflowActions,
  workflowConditions,
  workflowTriggers,
  type WorkflowAction,
  type WorkflowCondition,
  type WorkflowExecutionLog,
  type WorkflowLogStatus,
  type WorkflowRule,
  type WorkflowStatus,
  type WorkflowTrigger,
} from './workflowsMock'

const workflowStatusTone: Record<WorkflowStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  نشط: 'success',
  متوقف: 'muted',
  فشل: 'danger',
  'قيد الاختبار': 'info',
}

const logStatusLabels: Record<WorkflowLogStatus, string> = {
  rule_triggered: 'تم تشغيل القاعدة',
  action_executed: 'تم تنفيذ الإجراء',
  skipped: 'تم التخطي',
  failed: 'فشل',
}

const logStatusTone: Record<WorkflowLogStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  rule_triggered: 'info',
  action_executed: 'success',
  skipped: 'warning',
  failed: 'danger',
}

export default function WorkflowsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTrigger>(workflowTriggers[0])
  const [selectedCondition, setSelectedCondition] = useState<WorkflowCondition>(workflowConditions[0])
  const [selectedAction, setSelectedAction] = useState<WorkflowAction>(workflowActions[0])
  const [enabled, setEnabled] = useState(true)
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([])
  const [workflowExecutionLogs] = useState<WorkflowExecutionLog[]>([])

  useEffect(() => {
    let disposed = false

    apiFetch(apiUrl('/automation/workflows'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (disposed || typeof payload !== 'object' || payload === null) return
        const workflows = (payload as { workflows?: WorkflowRule[] }).workflows
        setWorkflowRules(Array.isArray(workflows) ? workflows : [])
      })
      .catch(() => {
        if (!disposed) setWorkflowRules([])
      })

    return () => {
      disposed = true
    }
  }, [])

  const activeRulesCount = workflowRules.filter((rule) => rule.enabled).length

  const workflowColumns = useMemo<Array<DataTableColumn<WorkflowRule>>>(() => [
    {
      key: 'name',
      header: 'اسم القاعدة',
      render: (rule) => (
        <div className="workflow-rule-name">
          <strong>{rule.name}</strong>
          <small>جاهزة للحدث: {rule.eventName}</small>
        </div>
      ),
    },
    { key: 'trigger', header: 'المحفز', render: (rule) => rule.trigger },
    { key: 'condition', header: 'الشرط', render: (rule) => rule.condition },
    { key: 'action', header: 'الإجراء', render: (rule) => rule.action },
    {
      key: 'status',
      header: 'الحالة',
      render: (rule) => <StatusBadge label={rule.status} tone={workflowStatusTone[rule.status]} />,
    },
    { key: 'lastRun', header: 'آخر تشغيل', render: (rule) => rule.lastRun },
  ], [])

  const logColumns = useMemo<Array<DataTableColumn<WorkflowExecutionLog>>>(() => [
    { key: 'ruleName', header: 'القاعدة', render: (log) => log.ruleName },
    {
      key: 'status',
      header: 'النتيجة',
      render: (log) => <StatusBadge label={logStatusLabels[log.status]} tone={logStatusTone[log.status]} />,
    },
    { key: 'detail', header: 'التفاصيل', render: (log) => log.detail },
    { key: 'occurredAt', header: 'الوقت', render: (log) => log.occurredAt },
  ], [])

  return (
    <div className="page-layout workflows-page">
      <AppCard>
        <PageHeader
          title="محرك الأتمتة"
          description="قواعد بسيطة لتوجيه المحادثات، مراقبة SLA، والتعامل مع العملاء حسب سياق القناة والأولوية."
          actions={(
            <AppButton
              variant="primary"
              onClick={() => showToast('تم حفظ مسودة القاعدة محلياً بانتظار ربط التنفيذ الفعلي', 'info')}
            >
              حفظ مسودة
            </AppButton>
          )}
        />

        <div className="workflow-summary-grid">
          <article>
            <span>{workflowRules.length}</span>
            <small>قواعد معرفة</small>
          </article>
          <article>
            <span>{activeRulesCount}</span>
            <small>قواعد مفعلة</small>
          </article>
          <article>
            <span>{workflowExecutionLogs.length}</span>
            <small>أحداث تنفيذ</small>
          </article>
        </div>
      </AppCard>

      <div className="workflow-builder-layout">
        <AppCard className="workflow-builder-panel">
          <PageHeader
            title="منشئ قاعدة"
            description="اختر المحفز والشرط والإجراء لتجهيز قاعدة قابلة للربط مع حافلة الأحداث لاحقاً."
          />

          <div className="workflow-builder-form">
            <label>
              <span>المحفز</span>
              <AppSelect value={selectedTrigger} onChange={(event) => setSelectedTrigger(event.target.value as WorkflowTrigger)}>
                {workflowTriggers.map((trigger) => <option key={trigger}>{trigger}</option>)}
              </AppSelect>
            </label>

            <label>
              <span>الشرط</span>
              <AppSelect value={selectedCondition} onChange={(event) => setSelectedCondition(event.target.value as WorkflowCondition)}>
                {workflowConditions.map((condition) => <option key={condition}>{condition}</option>)}
              </AppSelect>
            </label>

            <label>
              <span>الإجراء</span>
              <AppSelect value={selectedAction} onChange={(event) => setSelectedAction(event.target.value as WorkflowAction)}>
                {workflowActions.map((action) => <option key={action}>{action}</option>)}
              </AppSelect>
            </label>

            <label className="workflow-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              <span>تفعيل القاعدة</span>
            </label>
          </div>

          <div className="workflow-preview">
            <div className="workflow-preview-icon" aria-hidden="true">!</div>
            <div>
              <strong>معاينة التنفيذ</strong>
              <p>
                عند حدوث {selectedTrigger} وإذا تحقق شرط {selectedCondition} سيتم تنفيذ إجراء {selectedAction}.
              </p>
            </div>
            <StatusBadge label={enabled ? 'نشط' : 'متوقف'} tone={enabled ? 'success' : 'muted'} />
          </div>
        </AppCard>

        <AppCard>
          <PageHeader
            title="القواعد الحالية"
            description="قواعد الأتمتة الراجعة من واجهة REST."
          />
          <DataTable columns={workflowColumns} rows={workflowRules} getRowKey={(rule) => rule.id} />
          {!workflowRules.length ? <p className="notification-empty">لا توجد قواعد أتمتة محفوظة حالياً.</p> : null}
        </AppCard>
      </div>

      <AppCard>
        <PageHeader
          title="سجل التنفيذ"
          description="أحداث التنفيذ الراجعة من الخلفية عند توفرها."
        />
        <DataTable columns={logColumns} rows={workflowExecutionLogs} getRowKey={(log) => log.id} />
        {!workflowExecutionLogs.length ? <p className="notification-empty">لا توجد أحداث تنفيذ حالياً.</p> : null}
      </AppCard>
    </div>
  )
}
