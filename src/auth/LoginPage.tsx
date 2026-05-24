import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export default function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('فشل تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState message="جارِ التحقق من الجلسة..." />
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="official-logo-mark auth-logo-mark">
            <img src="/brand-logo.png" alt="ذكاء بلا حدود" />
          </span>
          <div>
            <p>ذكاء بلا حدود</p>
            <small>Unlimited Intelligence</small>
          </div>
        </div>
        <h1>مرحباً بك مجدداً</h1>
        <p>سجل دخولك للوصول إلى لوحة إدارة العملاء والقنوات الموحدة.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        {error ? <ErrorState title="خطأ في تسجيل الدخول" message={error} /> : null}
      </section>
    </div>
  )
}
