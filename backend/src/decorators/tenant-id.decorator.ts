import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const TenantId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>()
  const tenantId = request.headers['x-tenant-id']
  return Array.isArray(tenantId) ? tenantId[0] : tenantId
})
