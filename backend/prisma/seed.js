const { ChannelStatus, ChannelType, PermissionCategory, PrismaClient, TenantPlan, TenantStatus } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'default'
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'Default Tenant'
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default-tenant'
const DEFAULT_WHATSAPP_CHANNEL_ID = process.env.DEFAULT_WHATSAPP_CHANNEL_ID || 'default-whatsapp-channel'

const CRM_PERMISSIONS = [
  'dashboard.view',
  'inbox.view',
  'inbox.reply',
  'inbox.assign',
  'customers.view',
  'customers.manage',
  'appointments.view',
  'appointments.manage',
  'meetings.view',
  'meetings.manage',
  'tickets.view',
  'tickets.manage',
  'channels.view',
  'channels.manage',
  'templates.view',
  'templates.manage',
  'agents.view',
  'agents.manage',
  'users.view',
  'users.manage',
  'automation.view',
  'automation.manage',
  'reports.view',
  'reports.export',
  'billing.view',
  'billing.manage',
  'roles.view',
  'roles.manage',
  'settings.view',
  'settings.manage',
]

const DEFAULT_ROLE_PERMISSIONS = {
  COMPANY_ADMIN: CRM_PERMISSIONS,
  SUPERVISOR: [
    'dashboard.view',
    'inbox.view',
    'inbox.reply',
    'inbox.assign',
    'customers.view',
    'customers.manage',
    'tickets.view',
    'tickets.manage',
    'appointments.view',
    'appointments.manage',
    'meetings.view',
    'meetings.manage',
    'channels.view',
    'templates.view',
    'templates.manage',
    'agents.view',
    'users.view',
    'automation.view',
    'reports.view',
    'billing.view',
  ],
  AGENT: [
    'dashboard.view',
    'inbox.view',
    'inbox.reply',
    'customers.view',
    'tickets.view',
    'tickets.manage',
    'appointments.view',
    'appointments.manage',
    'meetings.view',
    'templates.view',
  ],
  VIEWER: [
    'dashboard.view',
    'inbox.view',
    'customers.view',
    'tickets.view',
    'appointments.view',
    'meetings.view',
    'channels.view',
    'templates.view',
    'automation.view',
    'reports.view',
    'billing.view',
    'settings.view',
    'users.view',
    'roles.view',
  ],
}

function categoryForPermission(key) {
  const prefix = key.split('.')[0]
  const categories = {
    dashboard: PermissionCategory.DASHBOARD,
    inbox: PermissionCategory.INBOX,
    customers: PermissionCategory.USERS,
    tickets: PermissionCategory.SYSTEM,
    appointments: PermissionCategory.SYSTEM,
    meetings: PermissionCategory.SYSTEM,
    channels: PermissionCategory.CHANNELS,
    templates: PermissionCategory.WHATSAPP,
    agents: PermissionCategory.USERS,
    users: PermissionCategory.USERS,
    automation: PermissionCategory.AUTOMATION,
    reports: PermissionCategory.REPORTS,
    billing: PermissionCategory.SYSTEM,
    roles: PermissionCategory.SYSTEM,
    settings: PermissionCategory.SYSTEM,
  }
  return categories[prefix] || PermissionCategory.SYSTEM
}

async function main() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is required to seed the WhatsApp channel')
  }

  if (!businessAccountId) {
    throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID is required to seed the WhatsApp channel')
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    create: {
      id: DEFAULT_TENANT_ID,
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      maxUsers: 50,
      maxChannels: 10,
      monthlyConversationLimit: 50000,
      createdBy: 'prisma-seed',
      updatedBy: 'prisma-seed',
    },
    update: {
      name: DEFAULT_TENANT_NAME,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      updatedBy: 'prisma-seed',
      deletedAt: null,
    },
  })

  const channel = await prisma.channel.upsert({
    where: { id: DEFAULT_WHATSAPP_CHANNEL_ID },
    create: {
      id: DEFAULT_WHATSAPP_CHANNEL_ID,
      tenantId: tenant.id,
      type: ChannelType.WHATSAPP,
      status: ChannelStatus.CONNECTED,
      name: 'WhatsApp Cloud API',
      externalId: phoneNumberId,
      connectedAt: new Date(),
      config: {
        phoneNumberId,
        businessAccountId,
        provider: 'meta-cloud-api',
        seeded: true,
      },
      createdBy: 'prisma-seed',
      updatedBy: 'prisma-seed',
    },
    update: {
      tenantId: tenant.id,
      type: ChannelType.WHATSAPP,
      status: ChannelStatus.CONNECTED,
      name: 'WhatsApp Cloud API',
      externalId: phoneNumberId,
      connectedAt: new Date(),
      deletedAt: null,
      config: {
        phoneNumberId,
        businessAccountId,
        provider: 'meta-cloud-api',
        seeded: true,
      },
      updatedBy: 'prisma-seed',
    },
  })

  console.log(`Seeded tenant ${tenant.slug} (${tenant.id})`)
  console.log(`Seeded WhatsApp channel ${channel.id} for phone_number_id=${phoneNumberId}`)

  for (const key of CRM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, category: categoryForPermission(key) },
      update: { category: categoryForPermission(key) },
    })
  }

  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
      create: {
        tenantId: tenant.id,
        name: roleName,
        description: `Default ${roleName} role`,
        createdBy: 'prisma-seed',
        updatedBy: 'prisma-seed',
      },
      update: {
        deletedAt: null,
        updatedBy: 'prisma-seed',
      },
    })
    const permissionRows = await prisma.permission.findMany({ where: { key: { in: permissions } }, select: { id: true } })
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    if (permissionRows.length) {
      await prisma.rolePermission.createMany({
        data: permissionRows.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
          createdBy: 'prisma-seed',
        })),
        skipDuplicates: true,
      })
    }
  }

  console.log('Seeded default roles and permissions')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
