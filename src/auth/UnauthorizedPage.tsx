import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span>!</span>
          <div>
            <p>غير مصرح</p>
            <small>لا تملك صلاحية الوصول</small>
          </div>
        </div>
        <h1>ليس لديك الصلاحيات المطلوبة</h1>
        <p>يبدو أن حسابك لا يملك صلاحية دخول هذه الصفحة. يرجى العودة إلى الملخص التنفيذي أو تسجيل الدخول بحساب مناسب.</p>
        <div className="auth-actions">
          <Link to="/" className="primary-button">
            العودة إلى الملخص التنفيذي
          </Link>
          <Link to="/login" className="secondary-button">
            تسجيل الدخول بحساب آخر
          </Link>
        </div>
      </section>
    </div>
  )
}
