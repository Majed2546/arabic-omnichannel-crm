import { RealtimeDebugPanel } from './RealtimeDebugPanel'
import { useInboxStore } from '../../features/inbox/inboxStore'
import { useNotificationStore } from '../../features/notifications/notificationStore'

export function RightSidebar() {
  const conversations = useInboxStore((state) => state.conversations)
  const notifications = useNotificationStore((state) => state.notifications)
  const activeConversations = conversations.filter((conversation) =>
    !conversation.archived && conversation.assignmentState !== 'مغلق'
  ).length
  const unreadNotifications = notifications.filter((notification) => !notification.read).length

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
          <span>{activeConversations}</span>
          <p className="text-safe">محادثات نشطة</p>
        </div>
        <div className="card-safe">
          <span>{unreadNotifications}</span>
          <p className="text-safe">تنبيهات غير مقروءة</p>
        </div>
        <div className="card-safe">
          <span>{conversations.length}</span>
          <p className="text-safe">إجمالي المحادثات</p>
        </div>
      </div>
      <div className="panel-card panel-actions card-safe">
        <h3 className="text-safe">الحالة التشغيلية</h3>
        <p className="panel-copy text-safe">
          {activeConversations > 0 ? 'توجد محادثات تحتاج متابعة.' : 'لا توجد محادثات نشطة حالياً.'}
        </p>
      </div>
      <RealtimeDebugPanel />
    </aside>
  )
}
