import { SetMetadata } from '@nestjs/common';
import type { PlanFeatures } from './plan-catalog';

export const REQUIRED_FEATURE_KEY = 'plan:requiredFeature';
export const PLAN_EXEMPT_KEY = 'plan:exempt';

/**
 * Exige que o recurso esteja liberado no plano da organização (ou por exceção do admin)
 * em TODA chamada da rota — não só na criação. Aplicado no controller, vale para todos
 * os métodos; o RbacGuard faz a checagem depois de validar o vínculo com o tenant.
 */
export const RequiresFeature = (feature: keyof PlanFeatures) => SetMetadata(REQUIRED_FEATURE_KEY, feature);

/**
 * Libera a rota da checagem de recurso do controller. Usado só para consultar e excluir:
 * depois de um rebaixamento o cliente precisa ver e remover o que tem, mas não usar.
 */
export const PlanExempt = () => SetMetadata(PLAN_EXEMPT_KEY, true);
