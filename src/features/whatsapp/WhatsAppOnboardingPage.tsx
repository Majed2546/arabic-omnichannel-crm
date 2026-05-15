import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUiStore } from '../../stores/uiStore'
import {
  whatsappBusinessSummary,
  whatsappConnectionLogs,
  whatsappConnectionStates,
  whatsappDiagnostics,
  whatsappOnboardingMock,
  whatsappQualityAlerts,
  whatsappSettings,
  whatsappTemplates,
  whatsappWebhookEvents,
  type CloudStatusTone,
  type WhatsAppTemplate,
  type WhatsAppWebhookEvent,
} from './whatsappMock'
import {
  connectionTone,
  DiagnosticItem,
  IntegrationStatusCard,
  Stepper,
  WhatsAppQualityBadge,
} from './WhatsAppIntegrationComponents'

const alertToneLabels: Record<CloudStatusTone, string> = {
  success: 'سليم',
  warning: 'تحذير',
  danger: 'حرج',
  info: 'مراقبة',
  muted: 'غير مفعل',
}

export default function WhatsAppOnboardingPage() {
  const showToast = useUiStore((state) => state.showToast)
  const [testRecipient, setTestRecipient] = useState('+966 55 000 0000')
  const [testBody, setTestBody] = useState('مرحباً، هذه رسالة اختبار من أومني تشات.')
  const [isSignupOpen, setSignupOpen] = useState(false)
  const onboarding = whatsappOnboardingMock

  const templateColumns = useMemo<Array<DataTableColumn<WhatsAppTemplate>>>(() => [
    { key: 'name', header: 'اسم القالب', render: (template) => template.name },
    { key: 'category', header: 'الفئة', render: (template) => template.category },
    { key: 'language', header: 'اللغة', render: (template) => template.language },
    {
      key: 'approvalStatus',
      header: 'حالة الاعتماد',
      render: (template) => <StatusBadge label={template.approvalStatus} tone={template.tone} />,
    },
  ], [])

  const webhookColumns = useMemo<Array<DataTableColumn<WhatsAppWebhookEvent>>>(() => [
    { key: 'name', header: 'الحدث', render: (event) => event.name },
    { key: 'mappedBusEvent', header: 'حدث النظام', render: (event) => event.mappedBusEvent },
    { key: 'payload', header: 'الوصف', render: (event) => event.payload },
    {
      key: 'status',
      header: 'الحالة',
      render: (event) => <StatusBadge label={event.status} tone={event.tone} />,
    },
    { key: 'receivedAt', header: 'آخر وصول', render: (event) => event.receivedAt },
  ], [])

  return (
    <div className="page-layout whatsapp-cloud-page">
      <AppCard className="whatsapp-cloud-hero">
        <PageHeader
          title="تكامل WhatsApp Cloud API"
          description="مساحة معمارية لتجهيز ربط Meta WhatsApp Business مع صندوق الوارد، القوالب، الويب هوك، ورسائل الاختبار بدون اتصال فعلي بعد."
          actions={(
            <>
              <AppButton
                variant="secondary"
                onClick={() => setSignupOpen(true)}
              >
                بدء Embedded Signup
              </AppButton>
              <AppButton
                variant="primary"
                onClick={() => showToast('تم حفظ إعدادات WhatsApp Cloud كمسودة محلية', 'success')}
              >
                حفظ المسودة
              </AppButton>
            </>
          )}
        />

        <div className="connection-state-strip">
          {whatsappConnectionStates.map((state) => (
            <StatusBadge
              key={state}
              label={state}
              tone={state === onboarding.connectionState ? connectionTone(state) : 'muted'}
            />
          ))}
        </div>

        <div className="whatsapp-status-grid">
          {onboarding.statuses.map((status) => (
            <IntegrationStatusCard key={status.label} status={status} />
          ))}
        </div>

        <div className="whatsapp-quality-strip">
          <WhatsAppQualityBadge rating="Green">Green</WhatsAppQualityBadge>
          <WhatsAppQualityBadge rating="Yellow">Yellow</WhatsAppQualityBadge>
          <WhatsAppQualityBadge rating="Red">Red</WhatsAppQualityBadge>
        </div>
      </AppCard>

      <div className="whatsapp-cloud-grid">
        <AppCard className="onboarding-panel">
          <PageHeader
            title="مسار التهيئة"
            description="تتبع مراحل الربط من Meta إلى اختبار الاتصال."
          />
          <div className="onboarding-progress" aria-label="تقدم تهيئة واتساب">
            <span style={{ width: `${onboarding.progress}%` }} />
          </div>
          <Stepper steps={onboarding.steps} />
        </AppCard>

        <AppCard>
          <PageHeader title="ملخص النشاط التجاري" description="بيانات جاهزة للعرض بعد اكتمال Embedded Signup." />
          <div className="business-summary-card">
            <div>
              <small>Business name</small>
              <strong>{whatsappBusinessSummary.businessName}</strong>
            </div>
            <div>
              <small>WABA ID</small>
              <strong>{whatsappBusinessSummary.wabaId}</strong>
            </div>
            <div>
              <small>Phone number</small>
              <strong>{whatsappBusinessSummary.phoneNumber}</strong>
            </div>
            <div>
              <small>Quality rating</small>
              <WhatsAppQualityBadge rating={whatsappBusinessSummary.qualityRating} />
            </div>
            <div>
              <small>Messaging tier</small>
              <strong>{whatsappBusinessSummary.messagingTier}</strong>
            </div>
          </div>
        </AppCard>
      </div>

      <div className="whatsapp-cloud-grid">
        <AppCard>
          <PageHeader
            title="إعدادات WhatsApp"
            description="قيم مؤقتة للمعمارية فقط، وسيتم استبدالها بخدمة أسرار آمنة عند الربط الحقيقي."
          />
          <div className="whatsapp-settings-list">
            {whatsappSettings.map((setting) => (
              <label key={setting.id}>
                <span>{setting.label}</span>
                <AppInput value={setting.masked ? '••••••••••••••••' : setting.value} readOnly />
              </label>
            ))}
          </div>
        </AppCard>

        <AppCard>
          <PageHeader title="سجل الربط" description="أحداث محاكاة من رحلة Embedded Signup والمزامنة." />
          <div className="connection-logs-list">
            {whatsappConnectionLogs.map((log) => (
              <article key={log.id}>
                <div>
                  <strong>{log.label}</strong>
                  <p>{log.detail}</p>
                </div>
                <span>{log.occurredAt}</span>
              </article>
            ))}
          </div>
        </AppCard>
      </div>

      <div className="whatsapp-cloud-grid">
        <AppCard>
          <PageHeader title="إدارة القوالب" description="قوالب الرسائل المرسلة للمراجعة والاعتماد داخل Meta." />
          <DataTable columns={templateColumns} rows={whatsappTemplates} getRowKey={(template) => template.id} />
        </AppCard>

        <AppCard>
          <PageHeader title="تشخيص Webhook" description="فحوصات جاهزة لتأكيد استقبال أحداث Meta بعد إضافة خدمة الخلفية." />
          <div className="diagnostics-grid">
            {whatsappDiagnostics.map((diagnostic) => (
              <DiagnosticItem key={diagnostic.id} item={diagnostic} />
            ))}
          </div>
        </AppCard>
      </div>

      <AppCard>
        <PageHeader title="تنبيهات جودة واتساب" description="حالات معمارية تظهر قبل تقييد المراسلة أو انخفاض الجودة." />
        <div className="quality-alerts-grid">
          {whatsappQualityAlerts.map((alert) => (
            <article key={alert.id}>
              <StatusBadge label={alertToneLabels[alert.tone]} tone={alert.tone} />
              <strong>{alert.label}</strong>
              <p>{alert.detail}</p>
            </article>
          ))}
        </div>
      </AppCard>

      <AppCard>
        <PageHeader
          title="عارض أحداث Webhook"
          description="أحداث Meta المتوقعة مع ربطها المفاهيمي بحافلة الأحداث الحالية."
        />
        <DataTable columns={webhookColumns} rows={whatsappWebhookEvents} getRowKey={(event) => event.id} />
      </AppCard>

      <AppCard>
        <PageHeader
          title="رسالة اختبار"
          description="Sandbox واجهة فقط لتجربة سيناريو الإرسال قبل إضافة Meta API الفعلي."
          actions={(
            <AppButton
              variant="secondary"
              onClick={() => showToast('تمت محاكاة إرسال رسالة الاختبار بدون الاتصال بـ Meta', 'info')}
            >
              إرسال اختبار
            </AppButton>
          )}
        />
        <div className="test-message-panel">
          <label>
            <span>رقم المستلم</span>
            <AppInput value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} />
          </label>
          <label>
            <span>نص الرسالة</span>
            <textarea value={testBody} onChange={(event) => setTestBody(event.target.value)} />
          </label>
          <div className="test-message-preview">
            <small>معاينة صندوق الوارد</small>
            <p>{testBody}</p>
            <StatusBadge label="محاكاة فقط" tone="info" />
          </div>
        </div>
      </AppCard>

      {isSignupOpen ? (
        <div className="signup-modal-backdrop" role="presentation">
          <section className="signup-modal" role="dialog" aria-modal="true" aria-labelledby="embedded-signup-title">
            <PageHeader
              title="معالج Embedded Signup"
              description="محاكاة تدفق Meta Embedded Signup بدون SDK أو OAuth حقيقي."
              actions={(
                <AppButton variant="ghost" onClick={() => setSignupOpen(false)}>
                  إغلاق
                </AppButton>
              )}
            />
            <Stepper steps={onboarding.steps} />
            <div className="signup-modal-body">
              <div>
                <h3 id="embedded-signup-title">تسجيل الدخول إلى Meta</h3>
                <p>سيتم هنا استدعاء Meta SDK وبدء OAuth عندما تصبح خدمة التكامل جاهزة.</p>
              </div>
              <StatusBadge label={onboarding.connectionState} tone={connectionTone(onboarding.connectionState)} />
            </div>
            <div className="signup-modal-actions">
              <AppButton variant="secondary" onClick={() => showToast('تمت محاكاة خطوة Meta Embedded Signup', 'info')}>
                متابعة الخطوة
              </AppButton>
              <AppButton variant="primary" onClick={() => setSignupOpen(false)}>
                إنهاء المحاكاة
              </AppButton>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
