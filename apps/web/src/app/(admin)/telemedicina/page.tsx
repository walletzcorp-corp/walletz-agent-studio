'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Video, Clock, CheckCircle2, XCircle, Users, FileText,
  Mic, Camera, Wifi, AlertTriangle, RefreshCw, Shield,
  PhoneOff, MonitorCheck, Share2, Plus,
} from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';

// ── Tipos ───────────────────────────────────────────────────────────────────
type RoomStatus = 'AGENDADA' | 'AGUARDANDO' | 'EM_ANDAMENTO' | 'ENCERRADA' | 'CANCELADA';
type ParticipantStatus = 'AGUARDANDO' | 'ADMITIDO' | 'CONECTADO' | 'DESCONECTADO' | 'SAIU';

interface Participant {
  id: string;
  displayName: string;
  role: string;
  status: ParticipantStatus;
  joinedAt?: string | null;
  reconnections: number;
}

interface TelEvent {
  id: string;
  eventType: string;
  actorRole: string;
  occurredAt: string;
  actorId: string;
}

interface Room {
  id: string;
  appointmentId: string;
  organizationId: string;
  status: RoomStatus;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  recordingEnabled: boolean;
  clinicalEntryId?: string | null;
  participants: Participant[];
  events?: TelEvent[];
}

interface Dashboard {
  agendadas: number;
  aguardando?: number;
  emAndamento: number;
  encerradas: number;
  canceladas?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusColor: Record<RoomStatus, { bg: string; text: string; label: string }> = {
  AGENDADA:     { bg: '#eef0ff', text: '#152DFF', label: 'Agendada' },
  AGUARDANDO:   { bg: '#fff0eb', text: '#e56035', label: 'Aguardando' },
  EM_ANDAMENTO: { bg: '#e6f8f7', text: '#009d8f', label: 'Em Andamento' },
  ENCERRADA:    { bg: '#f1f5f9', text: '#475569', label: 'Encerrada' },
  CANCELADA:    { bg: '#fee2e2', text: '#dc2626', label: 'Cancelada' },
};

const participantStatusColor: Record<ParticipantStatus, string> = {
  AGUARDANDO:    '#FF784F',
  ADMITIDO:      '#152DFF',
  CONECTADO:     '#00B7A8',
  DESCONECTADO:  '#94a3b8',
  SAIU:          '#64748b',
};

const eventLabels: Record<string, string> = {
  SALA_CRIADA:             'Sala criada',
  PARTICIPANTE_ENTROU:     'Participante entrou',
  PARTICIPANTE_ADMITIDO:   'Participante admitido',
  CHAMADA_INICIADA:        'Chamada iniciada',
  CHAMADA_ENCERRADA:       'Chamada encerrada',
  RECONEXAO:               'Reconexão',
  DOCUMENTO_COMPARTILHADO: 'Documento compartilhado',
  DOCUMENTO_CONFIRMADO:    'Documento confirmado no prontuário',
  EVOLUCAO_SALVA:          'Evolução vinculada ao prontuário',
  SALA_CANCELADA:          'Sala cancelada',
  LINK_REVOGADO:           'Link de acesso revogado',
};

type Tab = 'salas' | 'sala-espera' | 'dispositivos' | 'auditoria';

// ── RoomCard ──────────────────────────────────────────────────────────────────
function RoomCard({
  room,
  onAction,
}: {
  room: Room;
  onAction: (type: 'start' | 'admit' | 'end', roomId: string, participantId?: string) => Promise<void>;
}) {
  const cfg = statusColor[room.status];
  const time = new Date(room.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const patient = room.participants.find((p) => p.role === 'PACIENTE');
  const professional = room.participants.find((p) => p.role === 'PROFISSIONAL');

  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
            <Video size={16} style={{ color: cfg.text }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{patient?.displayName ?? '—'}</p>
            <p className="text-xs text-slate-400">{professional?.displayName ?? '—'}</p>
          </div>
        </div>
        <span className="badge text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ background: cfg.bg, color: cfg.text }}>
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
        <Clock size={12} />
        <span>{time}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {room.status === 'AGUARDANDO' && patient && (
          <button
            className="btn-primary text-xs py-1.5 px-3"
            onClick={() => onAction('admit', room.id, patient.id)}
          >
            Admitir paciente
          </button>
        )}
        {room.status === 'AGENDADA' && (
          <button className="btn-primary text-xs py-1.5 px-3" onClick={() => onAction('start', room.id)}>
            Iniciar sala
          </button>
        )}
        {room.status === 'EM_ANDAMENTO' && (
          <>
            <button className="btn-teal text-xs py-1.5 px-3">Entrar na sala</button>
            <button
              className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
              onClick={() => onAction('end', room.id)}
            >
              <PhoneOff size={12} /> Encerrar
            </button>
          </>
        )}
        {room.status === 'ENCERRADA' && room.clinicalEntryId && (
          <span className="badge badge-green text-xs flex items-center gap-1">
            <CheckCircle2 size={10} />
            Evolução vinculada
          </span>
        )}
        {room.status === 'ENCERRADA' && !room.clinicalEntryId && (
          <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
            <FileText size={12} /> Registrar evolução
          </button>
        )}
      </div>
    </div>
  );
}

function DeviceCheck() {
  const checks = [
    { icon: Camera, label: 'Câmera', ok: true },
    { icon: Mic, label: 'Microfone', ok: true },
    { icon: Wifi, label: 'Conexão', ok: true },
    { icon: MonitorCheck, label: 'Resolução mínima (720p)', ok: false },
  ];
  return (
    <div className="card max-w-lg">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <MonitorCheck size={18} style={{ color: '#152DFF' }} />
        Teste de Dispositivos
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Verifique câmera, microfone e conexão antes de iniciar o atendimento.
      </p>
      <div className="space-y-3">
        {checks.map(({ icon: Icon, label, ok }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
            <div className="flex items-center gap-3">
              <Icon size={16} className="text-slate-400" />
              <span className="text-sm text-slate-700">{label}</span>
            </div>
            {ok
              ? <CheckCircle2 size={16} style={{ color: '#00B7A8' }} />
              : <XCircle size={16} className="text-amber-500" />
            }
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn-primary text-sm py-2 px-4">Testar dispositivos</button>
        <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
    </div>
  );
}

function WaitingRoom({ rooms, onAdmit }: {
  rooms: Room[];
  onAdmit: (roomId: string, participantId: string) => Promise<void>;
}) {
  const waiting = rooms.filter((r) => r.status === 'AGUARDANDO');
  if (waiting.length === 0) {
    return (
      <div className="card text-center py-8 text-slate-400 text-sm">
        Nenhum paciente aguardando admissão.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {waiting.map((room) => {
        const patient = room.participants.find((p) => p.role === 'PACIENTE');
        if (!patient) return null;
        return (
          <div key={room.id} className="card border-l-4" style={{ borderLeftColor: '#FF784F' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#fff0eb' }}>
                <Users size={16} style={{ color: '#e56035' }} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{patient.displayName} aguarda admissão</p>
                <p className="text-xs text-slate-400">
                  {new Date(room.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-primary text-xs py-1.5 px-3"
                onClick={() => onAdmit(room.id, patient.id)}
              >
                Admitir agora
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditLog({ rooms }: { rooms: Room[] }) {
  const allEvents = rooms
    .flatMap((r) => (r.events ?? []).map((e) => ({ ...e, roomId: r.id })))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 50);

  if (allEvents.length === 0) {
    return (
      <div className="card text-center py-8 text-slate-400 text-sm">
        Nenhum evento registrado ainda.
      </div>
    );
  }
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
        <Shield size={15} style={{ color: '#152DFF' }} />
        Trilha de Auditoria
      </h3>
      <div className="space-y-0 text-sm">
        {allEvents.map((ev, i) => (
          <div
            key={ev.id}
            className={`flex items-start gap-3 py-2.5 ${i < allEvents.length - 1 ? 'border-b border-surface-border' : ''}`}
          >
            <div className="flex-shrink-0 w-20 text-xs text-slate-400 pt-0.5">
              {new Date(ev.occurredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="flex-1">
              <p className="text-slate-700 font-medium">{eventLabels[ev.eventType] ?? ev.eventType}</p>
              <p className="text-xs text-slate-400">{ev.actorRole}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Registros imutáveis — gerados automaticamente pelo sistema conforme RV-TELE-004.
      </p>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function TelemedicinePage() {
  const [tab, setTab] = useState<Tab>('salas');
  const [orgId, setOrgId] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const token = useToken();

  // Load organizations
  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations', token).then((r) => {
      const list = r.items ?? r.data ?? [];
      setOrgs(list);
      if (!orgId && list.length > 0) setOrgId(list[0].id);
    });
  }, [token]);

  const loadRooms = useCallback(async () => {
    if (!token || !orgId) return;
    setLoading(true);
    try {
      const [roomsData, dash] = await Promise.all([
        api.get<Room[]>(`/tel/${orgId}/rooms`, token),
        api.get<Dashboard>(`/tel/${orgId}/dashboard`, token),
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setDashboard(dash);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleAction = useCallback(
    async (type: 'start' | 'admit' | 'end', roomId: string, participantId?: string) => {
      if (!token || !orgId) return;
      try {
        if (type === 'start') {
          await api.patch(`/tel/${orgId}/rooms/${roomId}/start`, {}, token);
        } else if (type === 'admit' && participantId) {
          await api.patch(`/tel/${orgId}/rooms/${roomId}/participants/${participantId}/admit`, {}, token);
        } else if (type === 'end') {
          await api.patch(`/tel/${orgId}/rooms/${roomId}/end`, {}, token);
        }
        await loadRooms();
      } catch (e: any) {
        alert(e.message ?? 'Erro ao executar ação');
      }
    },
    [token, orgId, loadRooms],
  );

  const kpis = [
    { label: 'Em andamento',        value: dashboard?.emAndamento ?? 0, icon: Video,        bg: '#e6f8f7', fg: '#009d8f' },
    { label: 'Aguardando admissão', value: dashboard?.aguardando  ?? rooms.filter(r => r.status === 'AGUARDANDO').length, icon: Clock, bg: '#fff0eb', fg: '#e56035' },
    { label: 'Agendadas',           value: dashboard?.agendadas   ?? 0, icon: CheckCircle2, bg: '#eef0ff', fg: '#152DFF' },
    { label: 'Encerradas',          value: dashboard?.encerradas  ?? 0, icon: Share2,       bg: '#f1f5f9', fg: '#475569' },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Video }[] = [
    { id: 'salas',        label: 'Salas Virtuais', icon: Video },
    { id: 'sala-espera',  label: 'Sala de Espera', icon: Users },
    { id: 'dispositivos', label: 'Dispositivos',   icon: MonitorCheck },
    { id: 'auditoria',    label: 'Auditoria',      icon: Shield },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Telemedicina — Sala Virtual
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Atendimentos remotos seguros vinculados à agenda e ao prontuário
          </p>
        </div>
        {orgs.length > 1 && (
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        )}
      </div>

      {/* Aviso regulatório */}
      <div className="rounded-xl p-3 mb-6 flex items-start gap-3"
        style={{ background: '#eef0ff', border: '1px solid #c7cffe' }}>
        <AlertTriangle size={16} style={{ color: '#152DFF', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs" style={{ color: '#152DFF' }}>
          <strong>Segurança:</strong> links de acesso são individuais, temporários e revogáveis (RV-TELE-008).
          Gravação desativada por padrão — exige consentimento explícito (RV-TELE-007).
          Notificações ao paciente não contêm dados clínicos (RV-TELE-009).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(({ label, value, icon: Icon, bg, fg }) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color: fg }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-muted rounded-xl p-1 mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      {tab === 'salas' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">
              Salas {loading ? '…' : `(${rooms.length})`}
            </h2>
            <button className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Plus size={15} /> Nova Sala
            </button>
          </div>
          {loading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Carregando salas...</div>
          ) : rooms.length === 0 ? (
            <div className="text-slate-400 text-sm py-8 text-center card">
              Nenhuma sala criada para esta organização.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onAction={handleAction} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sala-espera' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Pacientes que entraram na sala antes de serem admitidos pelo profissional (RV-TELE-003).
          </p>
          <WaitingRoom
            rooms={rooms}
            onAdmit={(roomId, participantId) => handleAction('admit', roomId, participantId)}
          />
        </div>
      )}

      {tab === 'dispositivos' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Verifique câmera, microfone e conexão antes de iniciar ou entrar numa teleconsulta.
          </p>
          <DeviceCheck />
        </div>
      )}

      {tab === 'auditoria' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Trilha completa de eventos — imutável, conforme RV-TELE-004.
          </p>
          <AuditLog rooms={rooms} />
        </div>
      )}
    </div>
  );
}
