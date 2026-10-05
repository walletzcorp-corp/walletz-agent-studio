import { Injectable } from '@nestjs/common';
import type { Tenant } from '../../database/schema/tenants';

export type FeatureFlagKey =
  | 'whatsapp_integration'
  | 'google_calendar_integration'
  | 'microsoft_calendar_integration'
  | 'stripe_billing'
  | 'advanced_analytics'
  | 'ai_auto_learn'
  | 'bulk_messaging';

const PLAN_FLAGS: Record<string, FeatureFlagKey[]> = {
  starter: [],
  growth: ['bulk_messaging'],
  professional: ['bulk_messaging', 'advanced_analytics'],
  enterprise: ['bulk_messaging', 'advanced_analytics', 'ai_auto_learn'],
};

@Injectable()
export class FeatureFlagsService {
  isEnabled(tenant: Pick<Tenant, 'planId' | 'featureFlags'>, flag: FeatureFlagKey): boolean {
    const override = (tenant.featureFlags as Record<string, boolean> | null)?.[flag];
    if (override !== undefined) return override;

    const planId = tenant.planId ?? 'starter';
    return PLAN_FLAGS[planId]?.includes(flag) ?? false;
  }

  getAll(tenant: Pick<Tenant, 'planId' | 'featureFlags'>): Record<FeatureFlagKey, boolean> {
    const allFlags: FeatureFlagKey[] = [
      'whatsapp_integration',
      'google_calendar_integration',
      'microsoft_calendar_integration',
      'stripe_billing',
      'advanced_analytics',
      'ai_auto_learn',
      'bulk_messaging',
    ];

    return Object.fromEntries(
      allFlags.map((flag) => [flag, this.isEnabled(tenant, flag)]),
    ) as Record<FeatureFlagKey, boolean>;
  }
}
