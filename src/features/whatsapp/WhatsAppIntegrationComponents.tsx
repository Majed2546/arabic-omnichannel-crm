import type { ReactNode } from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type {
  CloudStatusTone,
  QualityRating,
  WhatsAppConnectionState,
  WhatsAppDiagnostic,
  WhatsAppWorkspaceStatus,
  WhatsAppWizardStep,
  WizardStepStatus,
} from './whatsappMock'

export function stepTone(status: WizardStepStatus): CloudStatusTone {
  if (status === 'مكتمل') return 'success'
  if (status === 'قيد التنفيذ') return 'warning'
  return 'muted'
}

export function connectionTone(state: WhatsAppConnectionState): CloudStatusTone {
  if (state === 'متصل') return 'success'
  if (state === 'جاري الربط' || state === 'يحتاج مراجعة') return 'warning'
  if (state === 'فشل الاتصال') return 'danger'
  return 'muted'
}

export function Stepper({ steps }: { steps: WhatsAppWizardStep[] }) {
  return (
    <ol className="integration-stepper">
      {steps.map((step, index) => (
        <li key={step.id} className={`integration-step ${step.status === 'مكتمل' ? 'complete' : step.status === 'قيد التنفيذ' ? 'current' : ''}`}>
          <span>{index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            <small>{step.description}</small>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function IntegrationStatusCard({ status }: { status: WhatsAppWorkspaceStatus }) {
  return (
    <article className="integration-status-card">
      <small>{status.label}</small>
      <StatusBadge label={status.value} tone={status.tone} />
    </article>
  )
}

export function DiagnosticItem({ item }: { item: WhatsAppDiagnostic }) {
  return (
    <article className="diagnostic-item">
      <div>
        <strong>{item.label}</strong>
        <p>{item.detail}</p>
      </div>
      <StatusBadge label={item.status} tone={item.tone} />
    </article>
  )
}

export function WhatsAppQualityBadge({ rating, children }: { rating: QualityRating; children?: ReactNode }) {
  return (
    <span className={`whatsapp-quality-badge ${rating.toLowerCase()}`}>
      <i aria-hidden="true" />
      {children ?? rating}
    </span>
  )
}
