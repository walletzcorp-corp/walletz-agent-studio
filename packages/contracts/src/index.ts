// Contratos compartilhados entre frontend e backend
// Módulo 1 — Organização, Unidades e Acesso

export type OrganizationStatus = 'RASCUNHO' | 'EM_VALIDACAO' | 'ATIVA' | 'SUSPENSA' | 'ENCERRADA';
export type UnitStatus = 'RASCUNHO' | 'ATIVA' | 'BLOQUEADA' | 'INATIVA';
export type UserStatus = 'CONVIDADO' | 'ATIVO' | 'BLOQUEADO' | 'ENCERRADO';
export type MembershipStatus = 'ATIVO' | 'BLOQUEADO' | 'ENCERRADO';
export type ProfessionalLinkStatus = 'PENDENTE' | 'VIGENTE' | 'EXPIRADO' | 'SUSPENSO' | 'ENCERRADO';
export type ResourceStatus = 'RASCUNHO' | 'ATIVO' | 'BLOQUEADO' | 'INATIVO';
export type ServiceStatus = 'RASCUNHO' | 'PUBLICADO' | 'DESCONTINUADO';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Organization {
  id: string;
  tenantId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  site?: string;
  timezone: string;
  locale: string;
  status: OrganizationStatus;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  email?: string;
  telefone?: string;
  cidade: string;
  uf: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  timezone: string;
  status: UnitStatus;
  checklistCompleted: boolean;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
}

export interface AuditEvent {
  id: string;
  tenantId?: string;
  organizationId?: string;
  unitId?: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  correlationId?: string;
  occurredAt: string;
}

// Eventos de domínio para o Outbox
export type DomainEventType =
  | 'organization.created'
  | 'organization.status_changed'
  | 'unit.created'
  | 'unit.status_changed'
  | 'membership.created'
  | 'membership.revoked'
  | 'professional.linked_to_unit'
  | 'resource.published'
  | 'service.published';
