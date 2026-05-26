import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import type { EmbeddedSignupCallbackDto, EmbeddedSignupStartDto, UpdateMetaSettingsDto } from './dto'

type MetaAppReviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'

type MetaSettings = {
  appId: string
  embeddedSignupConfigId: string
  redirectUri: string
  webhookUrl: string
  requiredPermissions: string[]
  appReviewStatus: MetaAppReviewStatus
  embeddedSignupEnabled: boolean
  techProviderVerified: boolean
  appLive: boolean
  webhookConfigured: boolean
  appSecretConfigured: boolean
  notes: string
  updatedAt: string
}

@Injectable()
export class MetaService {
  private settings: MetaSettings

  constructor(private readonly config: ConfigService) {
    this.settings = this.loadInitialSettings()
  }

  getSettings() {
    return this.safeSettings()
  }

  updateSettings(dto: UpdateMetaSettingsDto) {
    const appReviewStatus = dto.appReviewStatus === 'IN_REVIEW' ? 'IN_PROGRESS' : dto.appReviewStatus
    this.settings = {
      ...this.settings,
      ...dto,
      embeddedSignupConfigId: dto.embeddedSignupConfigId ?? dto.configId ?? this.settings.embeddedSignupConfigId,
      webhookUrl: dto.webhookUrl ?? dto.webhookCallbackUrl ?? this.settings.webhookUrl,
      appReviewStatus: appReviewStatus ?? this.settings.appReviewStatus,
      requiredPermissions: dto.requiredPermissions ?? this.settings.requiredPermissions,
      appSecretConfigured: this.settings.appSecretConfigured,
      updatedAt: new Date().toISOString(),
    }
    return this.safeSettings()
  }

  readiness() {
    const settings = this.safeSettings()
    return {
      ready: settings.readiness.ready,
      checklist: {
        appIdConfigured: Boolean(settings.appId),
        configIdConfigured: Boolean(settings.embeddedSignupConfigId),
        redirectUriConfigured: Boolean(settings.redirectUri),
        webhookUrlConfigured: Boolean(settings.webhookUrl),
        appReviewApproved: settings.appReviewStatus === 'APPROVED',
        techProviderVerified: settings.techProviderVerified,
        embeddedSignupEnabled: settings.embeddedSignupEnabled,
      },
      missing: settings.readiness.missing,
      updatedAt: settings.updatedAt,
    }
  }

  embeddedSignupStatus() {
    const settings = this.safeSettings()
    return {
      ready: settings.readiness.ready,
      embeddedSignupEnabled: settings.embeddedSignupEnabled,
      appReviewStatus: settings.appReviewStatus,
      checklist: settings.checklist,
      missing: settings.readiness.missing,
      message: settings.readiness.ready ? 'Meta Embedded Signup readiness is complete.' : 'Meta Embedded Signup settings are incomplete.',
    }
  }

  startEmbeddedSignup(dto: EmbeddedSignupStartDto) {
    const settings = this.safeSettings()
    const state = `meta_${dto.tenantId ?? 'tenant'}_${randomUUID()}`

    return {
      ready: settings.readiness.ready,
      mode: 'placeholder',
      appId: settings.appId,
      configId: settings.embeddedSignupConfigId,
      embeddedSignupConfigId: settings.embeddedSignupConfigId,
      redirectUri: settings.redirectUri,
      state,
      tenantId: dto.tenantId,
      requiredPermissions: settings.requiredPermissions,
      message: settings.readiness.ready
        ? 'Embedded Signup placeholder payload is ready. Real Meta OAuth code exchange is not enabled yet.'
        : 'Meta settings are incomplete. Complete App ID, Config ID, Redirect URI, Webhook URL, App Review, and Embedded Signup configuration first.',
      // TODO: Exchange the Meta auth code server-side only after App Review is complete.
      // TODO: Store business access tokens with application-level encryption and rotation metadata.
    }
  }

  embeddedSignupCallback(dto: EmbeddedSignupCallbackDto) {
    return {
      accepted: true,
      mode: 'placeholder',
      tenantId: dto.tenantId,
      state: dto.state,
      hasCode: Boolean(dto.code),
      error: dto.error,
      storedTokens: false,
      message: dto.error
        ? 'Embedded Signup callback received an error. No token exchange was attempted.'
        : 'Embedded Signup callback received. Real token exchange and encrypted token storage are not implemented in this release.',
      // TODO: Validate state, exchange code for tenant-scoped assets, then encrypt and persist tokens.
    }
  }

  private loadInitialSettings(): MetaSettings {
    const requiredPermissions = this.config.get<string>('META_REQUIRED_PERMISSIONS')
    return {
      appId: this.config.get<string>('META_APP_ID') ?? '',
      embeddedSignupConfigId: this.config.get<string>('META_EMBEDDED_SIGNUP_CONFIG_ID') ?? '',
      redirectUri: this.config.get<string>('META_REDIRECT_URI') ?? '',
      webhookUrl: this.config.get<string>('META_WEBHOOK_CALLBACK_URL') ?? '',
      requiredPermissions: requiredPermissions
        ? requiredPermissions.split(',').map((item) => item.trim()).filter(Boolean)
        : ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'],
      appReviewStatus: this.normalizeReviewStatus(this.config.get<string>('META_APP_REVIEW_STATUS')),
      embeddedSignupEnabled: this.config.get<string>('META_EMBEDDED_SIGNUP_ENABLED') === 'true',
      techProviderVerified: this.config.get<string>('META_TECH_PROVIDER_VERIFIED') === 'true',
      appLive: this.config.get<string>('META_APP_LIVE') === 'true',
      webhookConfigured: this.config.get<string>('META_WEBHOOK_CONFIGURED') === 'true',
      appSecretConfigured: Boolean(this.config.get<string>('META_APP_SECRET')),
      notes: '',
      updatedAt: new Date().toISOString(),
    }
  }

  private safeSettings() {
    const checklist = {
      appIdConfigured: Boolean(this.settings.appId),
      configIdConfigured: Boolean(this.settings.embeddedSignupConfigId),
      redirectUriConfigured: Boolean(this.settings.redirectUri),
      webhookUrlConfigured: Boolean(this.settings.webhookUrl),
      techProviderVerified: this.settings.techProviderVerified,
      appLive: this.settings.appLive,
      appReviewApproved: this.settings.appReviewStatus === 'APPROVED',
      webhookConfigured: this.settings.webhookConfigured && Boolean(this.settings.webhookUrl),
      embeddedSignupConfigured: this.settings.embeddedSignupEnabled && Boolean(this.settings.appId && this.settings.embeddedSignupConfigId && this.settings.redirectUri),
      embeddedSignupEnabled: this.settings.embeddedSignupEnabled,
    }
    const requiredReadinessKeys = [
      'appIdConfigured',
      'configIdConfigured',
      'redirectUriConfigured',
      'webhookUrlConfigured',
      'appReviewApproved',
      'techProviderVerified',
      'embeddedSignupEnabled',
    ] as const
    const missing = requiredReadinessKeys
      .filter((key) => !checklist[key])
    const allMissing = Object.entries(checklist)
      .filter(([, value]) => !value)
      .map(([key]) => key)

    return {
      appId: this.settings.appId,
      configId: this.settings.embeddedSignupConfigId,
      embeddedSignupConfigId: this.settings.embeddedSignupConfigId,
      redirectUri: this.settings.redirectUri,
      webhookCallbackUrl: this.settings.webhookUrl,
      webhookUrl: this.settings.webhookUrl,
      requiredPermissions: this.settings.requiredPermissions,
      appReviewStatus: this.settings.appReviewStatus,
      techProviderVerified: this.settings.techProviderVerified,
      embeddedSignupEnabled: this.settings.embeddedSignupEnabled,
      appSecretConfigured: this.settings.appSecretConfigured,
      notes: this.settings.notes,
      updatedAt: this.settings.updatedAt,
      checklist,
      readiness: {
        ready: missing.length === 0,
        missing,
        allMissing,
      },
    }
  }

  private normalizeReviewStatus(value?: string): MetaAppReviewStatus {
    if (value === 'APPROVED' || value === 'REJECTED' || value === 'IN_PROGRESS') return value
    if (value === 'IN_REVIEW') return 'IN_PROGRESS'
    return 'NOT_STARTED'
  }
}
