import { RealtimeDebugPanel } from './RealtimeDebugPanel'

export function RightSidebar() {
  return (
    <aside className="right-sidebar">
      <div className="panel-card card-safe">
        <p className="panel-label">مرحباً بك مجدداً</p>
        <h2 className="text-safe">إدارة القنوات في مكان واحد</h2>
        <p className="panel-copy text-safe">
          راقب الأداء عبر القنوات، تابع الصلاحيات، وابدأ رحلتك في إدارة الرسائل الموحدة.
        </p>
      </div>
      <div className="panel-card panel-stats card-safe">
        <div className="card-safe">
          <span>١٢</span>
          <p className="text-safe">قناة نشطة</p>
        </div>
        <div className="card-safe">
          <span>٢٨</span>
          <p className="text-safe">مستخدم نشط</p>
        </div>
        <div className="card-safe">
          <span>٩٤%</span>
          <p className="text-safe">توافر الخدمة</p>
        </div>
      </div>
      <div className="panel-card panel-actions card-safe">
        <h3 className="text-safe">أهم الخطوات</h3>
        <ul>
          <li>تأكيد ربط واتساب</li>
          <li>إعداد صلاحيات الفرق</li>
          <li>مراجعة عملاء التجربة</li>
        </ul>
      </div>
      <RealtimeDebugPanel />
    </aside>
  )
}
