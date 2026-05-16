const { ChannelStatus, ChannelType, PrismaClient, TenantStatus } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'default'
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'Default Tenant'
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default-tenant'
const DEFAULT_WHATSAPP_CHANNEL_ID = process.env.DEFAULT_WHATSAPP_CHANNEL_ID || 'default-whatsapp-channel'

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
      plan: 'production',
      createdBy: 'prisma-seed',
      updatedBy: 'prisma-seed',
    },
    update: {
      name: DEFAULT_TENANT_NAME,
      status: TenantStatus.ACTIVE,
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
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
