# MVP Acceptance Checklist

Release 26C final acceptance checklist. Use this file for manual QA sign-off after the automated build checks pass.

Status values: Pending, Pass, Fail, Blocked.

| Module | Test Case | Expected Result | Status | Notes | Owner | Date |
| --- | --- | --- | --- | --- | --- | --- |
| Executive Summary | Open `/` and `/dashboard`. | Both routes load `الملخص التنفيذي` for the selected tenant. | Pending | Route behavior verified by code path; needs browser smoke test. | QA | 2026-06-13 |
| Executive Summary | Load KPI cards. | Customers, active conversations, unread messages, open tickets, upcoming appointments, SLA alerts, unread notifications, and connected channels appear. | Pending | Uses `/reports/executive-summary`. | QA | 2026-06-13 |
| Executive Summary | Review inbox, tickets, SLA, appointments, automation, subscription, latest activity, and recommendations sections. | Sections render data or clear Arabic empty states. | Pending | Recommendations are conditional on KPI values. | QA | 2026-06-13 |
| Executive Summary | Switch tenant. | Summary clears stale data and reloads the selected tenant only. | Pending | Tenant context header controls API scope. | QA | 2026-06-13 |
| Platform Dashboard | Open platform dashboard as SUPER_ADMIN. | Platform metrics and tenant overview load. | Pending | Hidden from company users. | QA | 2026-06-13 |
| Platform Dashboard | Attempt access as company user. | Route is blocked by platform admin guard. | Pending | Validate with COMPANY_ADMIN and COMPANY_USER. | QA | 2026-06-13 |
| Tenants | Switch active tenant as SUPER_ADMIN. | Tenant switcher shows `companyDisplayName` and refreshes tenant-scoped pages. | Pending | Settings save refreshes tenant registry. | QA | 2026-06-13 |
| Tenants | Use company account. | User is locked to own tenant data. | Pending | TenantAccessService enforces access. | QA | 2026-06-13 |
| Subscription Requests | Open onboarding/subscription requests page as SUPER_ADMIN. | Requests list loads and platform-only route is accessible. | Pending | Company users must not see sidebar entry. | QA | 2026-06-13 |
| Billing and Plans | Open billing as SUPER_ADMIN. | Plans and company subscriptions load; selected/all scope filter works. | Pending | Mutations are platform-only. | QA | 2026-06-13 |
| Billing and Plans | Open billing as COMPANY_ADMIN. | Only current company subscription and usage appear; edit controls are hidden. | Pending | Backend returns tenant-scoped usage. | QA | 2026-06-13 |
| Usage | Open platform usage/report sections. | Usage counts for users, channels, conversations, and messages load. | Pending | Reports page clears stale bundle on reload. | QA | 2026-06-13 |
| Inbox | Send manual WhatsApp message. | Message is queued/sent and status displays correctly. | Pending | Requires live WhatsApp credentials/runtime. | QA | 2026-06-13 |
| Inbox | Receive WhatsApp message. | Incoming message appears in Inbox and conversation history. | Pending | Webhook verification unchanged. | QA | 2026-06-13 |
| Inbox | Use quick replies. | Quick reply inserts into composer without changing thread layout. | Pending | Existing UX retained. | QA | 2026-06-13 |
| Inbox | Open customer file and return conversation. | Customer file opens; conversation link returns to selected thread. | Pending | Query param `conversationId` supported. | QA | 2026-06-13 |
| Inbox | Assign user/team. | Assignment persists through API and refreshed Inbox data. | Pending | Quick header assignment uses real users/teams. | QA | 2026-06-13 |
| Customers | Create customer. | Customer is saved and selected details panel updates. | Pending | Requires `customers.manage`. | QA | 2026-06-13 |
| Customers | Edit customer. | Details, tags, notes, status, and contact data update. | Pending | Modal reuses selected customer state. | QA | 2026-06-13 |
| Customers | View related conversations. | Related conversations list appears in customer file. | Pending | Empty state is Arabic. | QA | 2026-06-13 |
| Customers | Open conversation from customer file. | User navigates to `/inbox?conversationId=...`. | Pending | Link exists per conversation. | QA | 2026-06-13 |
| Customers | Switch tenant. | Customer list and selected customer clear/reload without leakage. | Pending | Page clears state on tenant change. | QA | 2026-06-13 |
| Appointments | Create appointment. | Appointment is saved for current tenant/customer. | Pending | Requires `appointments.manage`. | QA | 2026-06-13 |
| Appointments | Edit appointment. | Title, status, assignment, link, and notes update. | Pending | Modal supports edit mode. | QA | 2026-06-13 |
| Appointments | Open/copy meeting link. | External meeting link opens; copy succeeds or shows Arabic warning. | Pending | Clipboard failure handled. | QA | 2026-06-13 |
| Appointments | Verify tenant timezone. | Appointment list and timeline display in tenant timezone with Riyadh fallback. | Pending | Reads `/settings`. | QA | 2026-06-13 |
| Visual Meetings | Open linked visual meeting. | Existing visual meeting link/page opens when `visualMeetingId` exists. | Pending | No new meeting module changes. | QA | 2026-06-13 |
| Tickets | Create ticket. | Ticket is saved with selected customer/conversation. | Pending | Requires ticket permissions. | QA | 2026-06-13 |
| Tickets | Edit, assign, and resolve ticket. | Ticket data, assigned user/team, and status persist. | Pending | SLA badge remains visible. | QA | 2026-06-13 |
| Tickets | Open conversation from ticket. | User navigates to the linked Inbox conversation. | Pending | Query param route supported. | QA | 2026-06-13 |
| Tickets | Automation/bot-created ticket appears. | Ticket appears with source details/tags/description. | Pending | Bot and automation create tickets in tenant scope. | QA | 2026-06-13 |
| Notifications | Receive realtime notification. | Bell count updates without full page refresh. | Pending | Realtime event triggers notification refresh. | QA | 2026-06-13 |
| Notifications | Use dropdown. | Dropdown appears above content; mark read and archive work. | Pending | Portal/z-index behavior retained. | QA | 2026-06-13 |
| Notifications | Open notifications page. | Notifications list loads and actions work. | Pending | Validate with tenant switch. | QA | 2026-06-13 |
| Channels | Open channels page. | Channels and connection states load for current tenant. | Pending | Tenant-scoped APIs. | QA | 2026-06-13 |
| Channels | Check Meta readiness. | Channels page reflects Meta readiness status. | Pending | Readiness from Meta settings. | QA | 2026-06-13 |
| Templates and Quick Replies | Create/edit quick replies. | Quick replies save and are available in Inbox composer. | Pending | No WhatsApp send behavior changed. | QA | 2026-06-13 |
| Templates and Quick Replies | Review WhatsApp templates. | Templates load and approved templates are selectable where supported. | Pending | Meta submission remains placeholder if configured that way. | QA | 2026-06-13 |
| WhatsApp AI Agent | Bot disabled. | Inbound messages do not trigger auto-reply. | Pending | Bot service returns skipped disabled. | QA | 2026-06-13 |
| WhatsApp AI Agent | Bot enabled main menu. | Bot sends main menu and message appears after realtime/refresh. | Pending | Bot publishes realtime message event. | QA | 2026-06-13 |
| WhatsApp AI Agent | Option 1 booking. | Appointment is created; Arabic date/time inputs parse correctly. | Pending | Test اليوم, غداً, بكرة, بعد بكرة, 11 صباحاً, 4 مساء, 16:00. | QA | 2026-06-13 |
| WhatsApp AI Agent | Option 2 ticket. | Ticket is created and visible in Tickets. | Pending | Tenant-scoped creation. | QA | 2026-06-13 |
| WhatsApp AI Agent | Option 4 handoff. | Conversation is handed off and assigned/defaulted as configured. | Pending | Bot state panel should reflect status. | QA | 2026-06-13 |
| Users | Open users page as admin. | Users list loads and restricted controls respect role. | Pending | COMPANY_USER cannot edit restricted users/roles. | QA | 2026-06-13 |
| Teams | Open teams page. | Teams list and assignment choices load for current tenant. | Pending | Used by Inbox, Tickets, Appointments. | QA | 2026-06-13 |
| Agents and Consultants | Open agents page. | Agents/consultants load; VIEWER does not appear. | Pending | Filter excludes viewer role/type. | QA | 2026-06-13 |
| Automation | Create automation rule. | Rule saves for selected tenant. | Pending | Requires `automation.manage`. | QA | 2026-06-13 |
| Automation | Toggle automation rule. | Rule active state persists and list refreshes. | Pending | Page clears stale rules on reload. | QA | 2026-06-13 |
| Automation | NEW_MESSAGE create_ticket action. | Incoming message creates one ticket and a log entry. | Pending | Duplicate prevention by message target. | QA | 2026-06-13 |
| Automation | View automation logs. | Logs display status, rule name, target, date, and message. | Pending | Page clears stale logs on tenant change. | QA | 2026-06-13 |
| Reports | Open reports page. | Overview, conversations, tickets, appointments, channels, and usage load. | Pending | Uses selected tenant for company users. | QA | 2026-06-13 |
| Reports | Switch tenant. | Report bundle clears and reloads selected tenant data. | Pending | Fixed in Release 26C. | QA | 2026-06-13 |
| Reports | Empty report data. | Arabic empty states appear instead of broken charts/tables. | Pending | PairList/UsageTable empty states. | QA | 2026-06-13 |
| Roles and Permissions | Verify SUPER_ADMIN. | Can access platform and tenant pages. | Pending | Platform-only routes require platform admin. | QA | 2026-06-13 |
| Roles and Permissions | Verify COMPANY_ADMIN. | Can manage own company data only. | Pending | Backend tenant access required. | QA | 2026-06-13 |
| Roles and Permissions | Verify COMPANY_USER. | Cannot edit restricted settings/users/roles. | Pending | UI hides controls; backend requires permissions. | QA | 2026-06-13 |
| Identity and Integrations | Open identity integrations. | Admin-only integrations page loads and respects permissions. | Pending | Company visibility depends on route permissions. | QA | 2026-06-13 |
| Meta Settings | Save Meta settings as SUPER_ADMIN. | Settings save and readiness recalculates. | Pending | Route is platform-only. | QA | 2026-06-13 |
| Meta Settings | Attempt access as company user. | Access is blocked and sidebar entry hidden. | Pending | `requirePlatformAdmin` enabled. | QA | 2026-06-13 |
| System Settings | Save company settings. | Settings save and `companyDisplayName` updates tenant switcher after refresh. | Pending | `refreshTenants()` runs after save. | QA | 2026-06-13 |
| System Settings | Open as read-only role. | Fields are disabled and save action hidden. | Pending | Requires `settings.manage` to edit. | QA | 2026-06-13 |
| Build Validation | Run frontend build. | `npm run build` passes. | Pending | Complete before sign-off. | QA | 2026-06-13 |
| Build Validation | Run backend build. | `backend npm run build` passes. | Pending | Complete before sign-off. | QA | 2026-06-13 |
| Build Validation | Run Docker config validation. | `docker compose config` passes. | Pending | Docker config warning may appear if local Docker config is unreadable. | QA | 2026-06-13 |
