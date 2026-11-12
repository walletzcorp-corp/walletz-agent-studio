'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, CheckCircle2, XCircle, AlertTriangle,
  Clock, Loader2, ChevronRight, ExternalLink, RefreshCw,
  Smartphone, Calendar, Brain, Globe, Mail, Webhook,
  CreditCard, Users, Zap, MoreHorizontal, ShieldCheck,
  Activity, Plus, Monitor, Puzzle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { apiUrl, withBasePath } from '../../../lib/paths';

/* ── Types ── */
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'warning' | 'pending' | 'reauth' | 'coming_soon';
type IntegrationCategory = 'all' | 'messaging' | 'ai' | 'calendar' | 'meta' | 'social' | 'crm' | 'automation' | 'payments' | 'developer' | 'devices';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory[];
  status: IntegrationStatus;
  provider: string;
  icon: React.ReactNode;
  iconBg: string;
  href?: string | undefined;
  connectHref?: string | undefined;
  lastSync?: string | undefined;
  meta?: Record<string, string> | undefined;
  featured?: boolean | undefined;
}

/* ── Category config ── */
const CATEGORIES: { id: IntegrationCategory; label: string }[] = [
  { id: 'all',         label: 'Todas' },
  { id: 'devices',     label: 'Dispositivos' },
  { id: 'messaging',   label: 'Mensageria' },
  { id: 'ai',          label: 'IA' },
  { id: 'calendar',    label: 'Agendas' },
  { id: 'meta',        label: 'Meta' },
  { id: 'social',      label: 'Sociais' },
  { id: 'crm',         label: 'CRM' },
  { id: 'automation',  label: 'Automações' },
  { id: 'payments',    label: 'Pagamentos' },
  { id: 'developer',   label: 'Desenvolvedor' },
];

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; className: string; icon: React.ElementType }> = {
  connected:    { label: 'Conectado',            className: 'badge-success',                                        icon: CheckCircle2 },
  disconnected: { label: 'Não conectado',        className: 'bg-surface-2 text-muted-foreground border border-border', icon: XCircle },
  error:        { label: 'Erro',                 className: 'badge-danger',                                         icon: XCircle },
  warning:      { label: 'Atenção',              className: 'badge-warning',                                        icon: AlertTriangle },
  pending:      { label: 'Conectando…',          className: 'badge-primary',                                        icon: Loader2 },
  reauth:       { label: 'Autorização expirada', className: 'badge-warning',                                        icon: AlertTriangle },
  coming_soon:  { label: 'Em breve',             className: 'bg-surface-2 text-muted-foreground/60 border border-border/50', icon: Clock },
};

/* ── WhatsApp icon ── */
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.957 7.571c-.14.55-.676 2.148-1.26 4.125l-.053.18c-.075.258-.154.53-.246.797l-.002.006c-.064.188-.135.386-.217.587a3.497 3.497 0 01-.265.528 1.67 1.67 0 01-.41.454 1.027 1.027 0 01-.607.2c-.19 0-.383-.047-.565-.139a2.302 2.302 0 01-.497-.38c-.153-.155-.303-.333-.447-.526a7.97 7.97 0 01-.418-.686 12.52 12.52 0 01-.371-.833 13.35 13.35 0 01-.26-.88c-.131.386-.266.756-.401 1.095a8.43 8.43 0 01-.449.933 3.62 3.62 0 01-.52.727c-.193.213-.408.385-.642.51a1.74 1.74 0 01-.824.197c-.277 0-.534-.06-.761-.178a1.95 1.95 0 01-.584-.508 3.14 3.14 0 01-.423-.837 7.3 7.3 0 01-.263-.966 15.85 15.85 0 01-.148-.817c-.032-.23-.055-.444-.07-.63-.014-.187-.021-.33-.021-.427 0-.1.003-.174.009-.222.016-.128.048-.25.096-.357.048-.108.11-.2.185-.274a.76.76 0 01.262-.17.961.961 0 01.332-.057c.176 0 .35.05.513.147.162.098.32.25.47.453.151.202.295.465.43.78.135.317.266.7.39 1.143.13-.43.273-.823.432-1.178.158-.355.33-.657.512-.902.183-.245.38-.437.587-.572.207-.135.43-.203.657-.203.198 0 .39.053.561.157.17.104.33.26.474.461.143.2.272.45.384.74.112.29.21.624.289.994.082-.37.176-.712.281-1.018.106-.307.226-.578.357-.811.13-.233.274-.427.43-.575.157-.148.33-.254.515-.314a1.9 1.9 0 01.588-.09c.218 0 .427.047.617.14.19.094.357.228.494.396.138.168.245.368.32.59.075.22.112.457.112.704 0 .073-.003.156-.009.247z"/>
  </svg>
);

/* ── Hook to load calendar connections ── */
function useCalendarConnections(tenantId: string | null) {
  const [connections, setConnections] = useState<{ id: string; provider: string; email: string; syncStatus: string; lastSyncAt: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
    if (!token) { setLoading(false); return; }
    try {
      const r = await fetch(apiUrl(`/v1/tenants/${tenantId}/calendars/connections`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setConnections(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);
  return { connections, loading, reload: load };
}

/* ── Build integration list from data ── */
function buildIntegrations(
  calConnections: { id: string; provider: string; email: string; syncStatus: string; lastSyncAt: string | null }[],
  pcDevices: { id: string; deviceName: string; pairedAt: string | null; lastSeenAt: string | null }[],
): Integration[] {
  const googleConn = calConnections.find(c => c.provider === 'google');
  const msConn     = calConnections.find(c => c.provider === 'microsoft');

  const connectedPc = pcDevices.find(d => d.pairedAt && d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < 30_000);
  const pairedPc    = pcDevices.find(d => d.pairedAt);
  const pcStatus: IntegrationStatus = connectedPc ? 'connected' : pairedPc ? 'warning' : 'disconnected';

  function calStatus(conn: typeof googleConn): IntegrationStatus {
    if (!conn) return 'disconnected';
    if (conn.syncStatus === 'synced') return 'connected';
    if (conn.syncStatus === 'error') return 'error';
    if (conn.syncStatus === 'reauth_required') return 'reauth';
    if (conn.syncStatus === 'pending') return 'pending';
    return 'disconnected';
  }

  return [
    /* ── DISPOSITIVOS ── */
    {
      id: 'meu-computador',
      name: 'Meu Computador',
      description: 'Permita que seus agentes executem tarefas autorizadas neste computador.',
      category: ['devices'],
      status: pcStatus,
      provider: 'Walletz PC Connector',
      icon: <Monitor className="h-6 w-6" />,
      iconBg: 'bg-[#6366F1]/10 text-[#6366F1]',
      href: '/integracoes/meu-computador',
      featured: true,
      meta: connectedPc ? { device: connectedPc.deviceName, status: 'Online' }
           : pairedPc   ? { device: pairedPc.deviceName, status: 'Offline' }
           : undefined,
    },
    /* ── FEATURED ── */
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Conecte seu número oficial, publique seu agente e comece a conversar com seus clientes.',
      category: ['messaging', 'meta'],
      status: 'disconnected',
      provider: 'Meta',
      icon: <WhatsAppIcon />,
      iconBg: 'bg-[#25D366]/10 text-[#25D366]',
      href: '/canais/whatsapp',
      featured: true,
    },
    /* ── CALENDARS ── */
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sincronize sua agenda, verifique disponibilidade e crie Google Meet automaticamente.',
      category: ['calendar'],
      status: calStatus(googleConn),
      provider: 'Google',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path d="M17.5 2h-11A4.5 4.5 0 002 6.5v11A4.5 4.5 0 006.5 22h11a4.5 4.5 0 004.5-4.5v-11A4.5 4.5 0 0017.5 2z" fill="#fff"/>
          <path d="M16 9H8v6h8V9z" fill="#1A73E8"/>
          <path d="M8 9V8h8v1H8zm0 6v1h8v-1H8zM8 9h-1v6h1V9zm8 0h1v6h-1V9z" fill="#1A73E8"/>
          <path d="M10 12h4" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      iconBg: 'bg-[#4285F4]/10',
      href: '/agendas',
      connectHref: `/v1/tenants/TENANT/calendars/google/authorize`,
      lastSync: googleConn?.lastSyncAt ?? undefined,
      meta: googleConn ? { email: googleConn.email } : undefined,
    },
    {
      id: 'microsoft-365',
      name: 'Microsoft 365 / Teams',
      description: 'Conecte seu calendário corporativo e crie reuniões Teams com link real.',
      category: ['calendar'],
      status: calStatus(msConn),
      provider: 'Microsoft',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M11.4 11.4H2V2h9.4v9.4z" fill="#F1511B"/>
          <path d="M22 11.4h-9.4V2H22v9.4z" fill="#80CC28"/>
          <path d="M11.4 22H2v-9.4h9.4V22z" fill="#00ADEF"/>
          <path d="M22 22h-9.4v-9.4H22V22z" fill="#FBBC09"/>
        </svg>
      ),
      iconBg: 'bg-[#5059C9]/10',
      href: '/agendas',
      connectHref: `/v1/tenants/TENANT/calendars/microsoft/authorize`,
      lastSync: msConn?.lastSyncAt ?? undefined,
      meta: msConn ? { email: msConn.email } : undefined,
    },
    /* ── AI ── */
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Modelos Claude para raciocínio avançado, escrita e uso de ferramentas.',
      category: ['ai'],
      status: 'connected',
      provider: 'Anthropic',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M13.8 2.4L20.4 18h-3.2l-1.4-3.4H8.2L6.8 18H3.6L10.2 2.4h3.6zm-1.8 4.2L9.4 12.2h5.2L12 6.6z" fill="#D97706"/>
        </svg>
      ),
      iconBg: 'bg-[#D97706]/10 text-[#D97706]',
      href: '/configuracoes/ia',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Modelos Gemini para desenvolvimento e testes com custo reduzido.',
      category: ['ai'],
      status: 'disconnected',
      provider: 'Google',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#4285F4"/>
        </svg>
      ),
      iconBg: 'bg-[#4285F4]/10',
      href: '/configuracoes/ia',
    },
    /* ── META ── */
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Conecte sua página do Facebook para receber e responder mensagens pelo Messenger.',
      category: ['meta', 'social'],
      status: 'coming_soon',
      provider: 'Meta',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      iconBg: 'bg-[#1877F2]/10',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Responda DMs do Instagram automaticamente com seus agentes.',
      category: ['meta', 'social'],
      status: 'coming_soon',
      provider: 'Meta',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="url(#igGrad)">
          <defs>
            <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFDC80"/>
              <stop offset="50%" stopColor="#E1306C"/>
              <stop offset="100%" stopColor="#833AB4"/>
            </linearGradient>
          </defs>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      iconBg: 'bg-pink-500/10',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Integração com LinkedIn para geração de leads B2B.',
      category: ['social', 'crm'],
      status: 'coming_soon',
      provider: 'LinkedIn',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      iconBg: 'bg-[#0A66C2]/10',
    },
    /* ── PAYMENTS ── */
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Cobranças, assinaturas e pagamentos para seus clientes.',
      category: ['payments'],
      status: 'coming_soon',
      provider: 'Stripe',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#6772E5">
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
        </svg>
      ),
      iconBg: 'bg-[#6772E5]/10',
      href: '/billing',
    },
    /* ── EMAIL ── */
    {
      id: 'email',
      name: 'E-mail',
      description: 'Envie e receba e-mails nos fluxos dos seus agentes.',
      category: ['messaging', 'automation'],
      status: 'coming_soon',
      provider: 'SMTP / IMAP',
      icon: <Mail className="h-6 w-6" />,
      iconBg: 'bg-surface-3 text-muted-foreground',
    },
    /* ── WEBHOOK ── */
    {
      id: 'webhook',
      name: 'Webhook',
      description: 'Receba e envie eventos para qualquer sistema externo via HTTP.',
      category: ['developer', 'automation'],
      status: 'coming_soon',
      provider: 'HTTP',
      icon: <Webhook className="h-6 w-6" />,
      iconBg: 'bg-surface-3 text-muted-foreground',
    },
  ];
}

/* ── PC Devices hook ── */
function usePcDevices(tenantId: string | null) {
  const [devices, setDevices] = useState<{ id: string; deviceName: string; pairedAt: string | null; lastSeenAt: string | null }[]>([]);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
    if (!token) return;
    try {
      const r = await fetch(apiUrl(`/v1/tenants/${tenantId}/pc-connector/devices`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setDevices(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);
  return { devices, reload: load };
}

/* ── Page ── */
export default function IntegracoesPage() {
  const { tenantId } = useAuth();
  const { connections, loading } = useCalendarConnections(tenantId);
  const { devices: pcDevicesList } = usePcDevices(tenantId);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IntegrationCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'disconnected' | 'error'>('all');

  const integrations = buildIntegrations(connections, pcDevicesList);

  const filtered = integrations.filter((i) => {
    const matchCat = category === 'all' || i.category.includes(category);
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'connected' ? i.status === 'connected'
      : statusFilter === 'disconnected' ? ['disconnected', 'coming_soon'].includes(i.status)
      : ['error', 'warning', 'reauth'].includes(i.status);
    return matchCat && matchSearch && matchStatus;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const errorCount     = integrations.filter(i => ['error', 'warning', 'reauth'].includes(i.status)).length;
  const featuredIntegration = integrations.find(i => i.featured);
  const otherIntegrations   = filtered.filter(i => !i.featured);

  function handleConnect(integration: Integration) {
    if (!tenantId) return;
    if (integration.connectHref) {
      window.location.href = apiUrl(integration.connectHref.replace('TENANT', tenantId));
      return;
    }
    if (integration.href) {
      window.location.href = withBasePath(integration.href);
    }
  }

  return (
    <div className="page-container space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Integrações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte os serviços que seus agentes precisam para trabalhar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Health indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              <span className="text-neural-success font-semibold">{connectedCount}</span> conectadas
              {errorCount > 0 && (
                <>, <span className="text-neural-danger font-semibold">{errorCount}</span> com erro</>
              )}
            </span>
          </div>
          <button className="btn-ghost flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Credenciais
          </button>
        </div>
      </div>

      {/* Featured — WhatsApp */}
      {featuredIntegration && (category === 'all' || category === 'messaging' || category === 'meta') && !search && (
        <div className="relative overflow-hidden rounded-xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/5 via-surface-1 to-surface-1 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[#25D366]/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] shrink-0">
                <WhatsAppIcon />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-display font-semibold text-foreground">WhatsApp Business</h3>
                  <span className="rounded-full bg-[#25D366]/10 border border-[#25D366]/30 px-2 py-0.5 text-[10px] font-semibold text-[#25D366] uppercase tracking-wide">
                    Principal
                  </span>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Conecte seu número oficial, publique seu agente e comece a conversar com seus clientes.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Provider: Meta · Requer aprovação Meta Business
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3" />
                Não conectado
              </span>
              <Link
                href="/canais/whatsapp"
                className="flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#22c55e] text-white px-4 py-2 text-sm font-semibold transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                Conectar e Testar
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm rounded-lg border border-border bg-surface-1 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar integração…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="connected">Conectados</option>
          <option value="disconnected">Não conectados</option>
          <option value="error">Com erro</option>
        </select>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                category === cat.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="neural-card p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-surface-2" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-surface-2 rounded" />
                  <div className="h-3 w-16 bg-surface-2 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-surface-2 rounded" />
              <div className="h-3 w-3/4 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      ) : otherIntegrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Puzzle className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma integração encontrada</h3>
          <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou a busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherIntegrations.map(integration => {
            const statusCfg = STATUS_CONFIG[integration.status];
            const StatusIcon = statusCfg.icon;
            const isComingSoon = integration.status === 'coming_soon';
            const isConnected  = integration.status === 'connected';

            return (
              <div
                key={integration.id}
                className={`neural-card p-5 flex flex-col gap-4 transition-all duration-200 ${
                  isComingSoon ? 'opacity-60' : 'hover:border-border/70'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-border shrink-0 ${integration.iconBg}`}>
                      {integration.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{integration.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{integration.provider}</p>
                    </div>
                  </div>
                  {!isComingSoon && (
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{integration.description}</p>

                {/* Meta info */}
                {integration.meta?.email && (
                  <p className="text-xs text-neural-blue truncate">{integration.meta.email}</p>
                )}
                {integration.lastSync && (
                  <p className="text-[11px] text-muted-foreground/60">
                    Última sync: {new Date(integration.lastSync).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusCfg.className}`}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {statusCfg.label}
                  </span>

                  {isComingSoon ? (
                    <span className="text-[11px] text-muted-foreground/50 italic">Disponível em breve</span>
                  ) : isConnected ? (
                    <Link
                      href={integration.href ?? '#'}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors font-medium"
                    >
                      Gerenciar
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration)}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Conectar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {[
          { href: '/meta',           label: 'Central Meta',       desc: 'Templates, webhooks e custos Meta',  icon: MetaIcon, color: 'text-blue-400' },
          { href: '/configuracoes/ia', label: 'Configurar IA',      desc: 'Provider, modelo, fallback e uso',   icon: Brain,    color: 'text-purple-400' },
          { href: '/billing',        label: 'Billing Walletz',    desc: 'Plano, faturas e pagamento',         icon: CreditCard, color: 'text-green-400' },
        ].map(link => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3 hover:border-border/60 hover:bg-surface-2 transition-all group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 shrink-0">
                <Icon className={`h-4 w-4 ${link.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto group-hover:text-primary/60 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
