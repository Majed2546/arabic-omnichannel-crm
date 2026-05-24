import { AppCard } from '../../components/ui/AppCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/layout/PageHeader'
import { AUTH_MODE, isKeycloakConfigured, keycloakConfig } from '../../auth/authConfig'

export default function IdentityIntegrationsPage() {
  const keycloakReady = isKeycloakConfigured()

  return (
    <div className="page-layout">
      <AppCard>
        <PageHeader
          title="إدارة الهوية والتكاملات"
          description="مركز ربط الهوية المؤسسية وتهيئة Keycloak بشكل تدريجي وآمن."
        />

        <div className="settings-grid">
          <article className="settings-card">
            <div className="panel-header">
              <p className="panel-label">Keycloak</p>
              <h2>مزود الهوية المؤسسي</h2>
              <p>يدعم تسجيل الدخول الموحد وربط أدوار Keycloak بصلاحيات CRM.</p>
            </div>
            <dl className="meta-list">
              <div>
                <dt>وضع المصادقة</dt>
                <dd><StatusBadge label={AUTH_MODE} tone={AUTH_MODE === 'keycloak' ? 'success' : 'muted'} /></dd>
              </div>
              <div>
                <dt>حالة الإعداد</dt>
                <dd><StatusBadge label={keycloakReady ? 'مهيأ' : 'غير مهيأ'} tone={keycloakReady ? 'success' : 'warning'} /></dd>
              </div>
              <div>
                <dt>Realm</dt>
                <dd>{keycloakConfig.realm ?? 'غير محدد'}</dd>
              </div>
              <div>
                <dt>Client ID</dt>
                <dd>{keycloakConfig.clientId ?? 'غير محدد'}</dd>
              </div>
            </dl>
          </article>

          <article className="settings-card">
            <div className="panel-header">
              <p className="panel-label">RBAC</p>
              <h2>ربط الأدوار والصلاحيات</h2>
              <p>الأدوار الخارجية مثل crm-admin وcrm-support وcrm-analyst تتحول إلى أدوار CRM محلية.</p>
            </div>
            <div className="tag-list">
              <span>admin</span>
              <span>support</span>
              <span>analyst</span>
            </div>
          </article>
        </div>
      </AppCard>
    </div>
  )
}
