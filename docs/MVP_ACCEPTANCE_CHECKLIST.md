# MVP Acceptance Checklist

Use this checklist for Release 26 manual acceptance testing. Mark each item as Pass or Fail, add notes, owner, and test date.

| Module | Acceptance item | Pass/Fail | Notes | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| Executive Summary | `/` opens الملخص التنفيذي and metrics load for the selected tenant. |  |  |  |  |
| Executive Summary | `/dashboard` remains supported and opens the same page. |  |  |  |  |
| Executive Summary | Switching tenant refreshes summary data without browser refresh. |  |  |  |  |
| Navigation | Sidebar labels match approved Arabic terminology. |  |  |  |  |
| Navigation | `/agents` opens المستشارون والوكلاء and `/tenants` redirects for compatibility. |  |  |  |  |
| Navigation | Platform-only pages are hidden from company users. |  |  |  |  |
| Roles | SUPER_ADMIN can access platform pages. |  |  |  |  |
| Roles | COMPANY_ADMIN can access own company pages only. |  |  |  |  |
| Roles | COMPANY_USER cannot edit restricted settings, users, or roles. |  |  |  |  |
| Roles | VIEWER users do not appear in المستشارون والوكلاء. |  |  |  |  |
| Tenant Switching | Tenant switcher displays companyDisplayName from settings. |  |  |  |  |
| Tenant Switching | Tenant-scoped pages clear stale data when tenant changes. |  |  |  |  |
| Inbox | Manual WhatsApp send works from صندوق الوارد. |  |  |  |  |
| Inbox | Incoming messages appear without page refresh. |  |  |  |  |
| Inbox | Message status updates display correctly. |  |  |  |  |
| Inbox | Bot/system messages display in the thread. |  |  |  |  |
| Inbox | Quick replies insert correctly into composer. |  |  |  |  |
| Inbox | Customer file opens from inbox. |  |  |  |  |
| Inbox | Conversation opens from customer file. |  |  |  |  |
| Inbox | Assignment to user/team works. |  |  |  |  |
| WhatsApp Cloud API | Send/receive behavior is unchanged after Release 26. |  |  |  |  |
| WhatsApp Cloud API | Webhook behavior is unchanged after Release 26. |  |  |  |  |
| WhatsApp AI Agent | Bot disabled means no auto-reply. |  |  |  |  |
| WhatsApp AI Agent | Bot enabled sends the main menu. |  |  |  |  |
| WhatsApp AI Agent | Option 1 creates appointment. |  |  |  |  |
| WhatsApp AI Agent | Option 2 creates ticket. |  |  |  |  |
| WhatsApp AI Agent | Option 4 handoff works. |  |  |  |  |
| WhatsApp AI Agent | Bot messages appear in Inbox after refresh and realtime updates. |  |  |  |  |
| WhatsApp AI Agent | Failed old bot messages do not block new flows. |  |  |  |  |
| Customers | Create customer works. |  |  |  |  |
| Customers | Edit customer updates details. |  |  |  |  |
| Customers | Related conversations are visible. |  |  |  |  |
| Customers | Tenant isolation prevents cross-tenant customer visibility. |  |  |  |  |
| Tickets | Create ticket works. |  |  |  |  |
| Tickets | Edit and resolve ticket works. |  |  |  |  |
| Tickets | Assign user/team works. |  |  |  |  |
| Tickets | SLA status is visible. |  |  |  |  |
| Tickets | Automation/bot-created tickets are identifiable. |  |  |  |  |
| Tickets | Open conversation button works. |  |  |  |  |
| Appointments | Create appointment works. |  |  |  |  |
| Appointments | Edit appointment works. |  |  |  |  |
| Appointments | Bot-created appointment appears. |  |  |  |  |
| Appointments | Assigned user/team is visible. |  |  |  |  |
| Meetings | Link meeting URL works. |  |  |  |  |
| Meetings | Copy/open meeting link works. |  |  |  |  |
| Automation | Create rule works. |  |  |  |  |
| Automation | Toggle rule works. |  |  |  |  |
| Automation | NEW_MESSAGE create_ticket works. |  |  |  |  |
| Automation | Logs are visible. |  |  |  |  |
| Notifications | Bell count updates. |  |  |  |  |
| Notifications | Dropdown appears above content and modals. |  |  |  |  |
| Notifications | Mark read/archive works. |  |  |  |  |
| Notifications | Notifications page works. |  |  |  |  |
| Reports | Reports load for the selected tenant. |  |  |  |  |
| Billing | Company Admin sees own subscription only. |  |  |  |  |
| Billing | Super Admin can filter companies. |  |  |  |  |
| Settings | System settings save. |  |  |  |  |
| Settings | Company display name updates switcher. |  |  |  |  |
| Meta | Meta settings save. |  |  |  |  |
| Channels | Channels page reflects Meta readiness. |  |  |  |  |
| Responsive UI | Pages work at 100% browser zoom on desktop. |  |  |  |  |
| Responsive UI | Core pages are usable on mobile width without unnecessary horizontal scroll. |  |  |  |  |
| Build | `npm run build` passes. |  |  |  |  |
| Build | `backend npm run build` passes. |  |  |  |  |
| Build | `docker compose config` passes. |  |  |  |  |
