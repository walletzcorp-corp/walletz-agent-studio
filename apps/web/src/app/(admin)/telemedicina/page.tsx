'use client';
import { useState } from 'react';
import {
  Video, Clock, CheckCircle2, XCircle, Users, FileText,
  Mic, Camera, Wifi, AlertTriangle, RefreshCw, Shield,
  PhoneOff, MonitorCheck, Share2,
} from 'lucide-react';

// ── Tipos ───────────────────────────────────────────────────────────────────
type RoomStatus = 'AGENDADA' | 'AGUARDANDO' | 'EM_ANDAMENTO' | 'ENCERRADA' | 'CANCELADA';
type ParticipantStatus = 'AGUARDANDO' | 'ADMITIDO' | 'CONECTADO' | 'DESCONECTADO' | 'SAIU';
type EventType = string;

interface MockRoom {
  id: string;
  appointmentId: string;
  patientName: string;
  professionalName: string;
  scheduledAt: string;
  status: RoomStatus;
  startedAt?: string;
  endedAt?: string;
  recordingEnabled: boolean;
  clinicalEntryId?: string;
}

interface MockEvent {
  id: string;
  eventType: EventType;
  actorRole: string;
  occurredAt: string;
  actorName: string;
}

interface MockParticipant {
  id: string;
  displayName: string;
  role: string;
  status: ParticipantStatus;
  joinedAt?: string;
  reconnections: number;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const mockRooms: MockRoom[] = [
  {
    id: 'room-1',
    appointmentId: 'apt-001',
    patientName: 'Ana Souza',
    professionalName: 'Dra. Carla Mendes',
    scheduledAt: '2026-10-02T14:00:00Z',
    status: 'EM_ANDAMENTO',
    startedAt: '2026-10-02T14:02:10Z',
    recordingEnabled: false,
  },
  {
    id: 'room-2',
    appointmentId: 'apt-002',
    patientName: 'João Lima',
    professionalName: 'Dr. Ricardo Alves',
    scheduledAt: '2026-10-02T15:30:00Z',
    status: 'AGUARDANDO',
    recordingEnabled: false,
  },
  {
    id: 'room-3',
    appointmentId: 'apt-003',
    patientName: 'Mariana Costa',
    professionalName: 'Dra. Carla Mendes',
    scheduledAt: '2026-10-02T10:00:00Z',
    status: 'ENCERRADA',
    startedAt: '2026-10-02T10:01:00Z',
    endedAt: '2026-10-02T10:42:00Z',
    recordingEnabled: false,
    clinicalEntryId: 'entry-78',
  },
  {
    id: 'room-4',
    appointmentId: 'apt-004',
    patientName: 'Carlos Pereira',
    professionalName: 'Dr. Ricardo Alves',
    scheduledAt: '2026-10-03T09:00:00Z',
    status: 'AGENDADA',
    recordingEnabled: false,
  },
];

const mockParticipants: MockParticipant[] = [
  { id: 'p1', displayName: 'Dra. Carla Mendes', role: 'PROFISSIONAL', status: 'CONECTADO', joinedAt: '14:02', reconnections: 0 },
  { id: 'p2', displayName: 'Ana Souza', role: 'PACIENTE', status: 'ADMITIDO', joinedAt: '14:01', reconnections: 1 },
];

const mockEvents: MockEvent[] = [
  { id: 'e1', eventType: 'SALA_CRIADA', actorRole: 'PROFISSIONAL', occurredAt: '13:55', actorName: 'Sistema' },
  { id: 'e2', eventType: 'PARTICIPANTE_ENTROU', actorRole: 'PACIENTE', occurredAt: '14:01', actorName: 'Ana Souza' },
  { id: 'e3', eventType: 'PARTICIPANTE_ADMITIDO', actorRole: 'PROFISSIONAL', occurredAt: '14:02', actorName: 'Dra. Carla Mendes' },
  { id: 'e4', eventType: 'CHAMADA_INICIADA', actorRole: 'PROFISSIONAL', occurredAt: '14:02', actorName: 'Dra. Carla Mendes' },
  { id: 'e5', eventType: 'RECONEXAO', actorRole: 'PACIENTE', occurredAt: '14:08', actorName: 'Ana Souza' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusColor: Record<RoomStatus, { bg: string; text: string; label: string }> = {
  AGENDADA:     { bg: '#eef0ff', text: '#152DFF', label: 'Agendada' },
  AGUARDANDO:   { bg: '#fff0eb', text: '#e56035', label: 'Aguardando' },
  EM_ANDAMENTO: { bg: '#e6f8f7', text: '#009d8f', label: 'Em Andamento' },
  ENCERRADA:    { bg: '#f1f5f9', text: '#475569', label: 'Encerrada' },
  CANCELADA:    { bg: '#fee2e2', text: '#dc2626', label: 'Cancelada' },
};

const participantStatusColor: Record<ParticipantStatus, string> = {
  AGUARDANDO: '#FF784F',
  ADMITIDO:   '#152DFF',
  CONECTADO:  '#00B7A8',
  DESCONECTADO: '#94a3b8',
  SAIU:       '#64748b',
};

const eventLabels: Record<string, string> = {
  SALA_CRIADA:              'Sala criada',
  PARTICIPANTE_ENTROU:      'Participante entrou',
  PARTICIPANTE_ADMITIDO:    'Participante admitido',
  CHAMADA_INICIADA:         'Chamada iniciada',
  CHAMADA_ENCERRADA:        'Chamada encerrada',
  RECONEXAO:                'Reconexão',
  DOCUMENTO_COMPARTILHADO:  'Documento compartilhado',
  DOCUMENTO_CONFIRMADO:     'Documento confirmado no prontuário',
  EVOLUCAO_SALVA:           'Evolução vinculada ao prontuário',
  SALA_CANCELADA:           'Sala cancelada',
  LINK_REVOGADO:            'Link de acesso revogado',
};

type Tab = 'salas' | 'sala-espera' | 'dispositivos' | 'auditoria';

// ── Componentes internos ─────────────────────────────────────────────────────
function RoomCard({ room }: { room: MockRoom }) {
  const cfg = statusColor[room.status];
  const time = new Date(room.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
            <Video size={16} style={{ color: cfg.text }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{room.patientName}</p>
            <p className="text-xs text-slate-400">{room.professionalName}</p>
          </div>
        </div>
        <span className="badge text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ background: cfg.bg, color: cfg.text }}>
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
        <Clock size={12} />
        <span>{time} · Apt #{room.appointmentId}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {room.status === 'AGUARDANDO' && (
          <button className="btn-primary text-xs py-1.5 px-3">Admitir paciente</button>
        )}
        {room.status === 'AGENDADA' && (
          <button className="btn-primary text-xs py-1.5 px-3">Iniciar sala</button>
        )}
        {room.status === 'EM_ANDAMENTO' && (
          <>
            <button className="btn-teal text-xs py-1.5 px-3">Entrar na sala</button>
            <button className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1">
              <PhoneOff size={12} /> Encerrar
            </button>
          </>
        )}
        {room.status === 'ENCERRADA' && room.clinicalEntryId && (
          <span className="badge badge-green text-xs">
            <CheckCircle2 size={10} className="mr-1" />
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

function WaitingRoom() {
  return (
    <div className="space-y-4">
      <div className="card border-l-4" style={{ borderLeftColor: '#FF784F' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#fff0eb' }}>
            <Users size={16} style={{ color: '#e56035' }} />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">João Lima aguarda admissão</p>
            <p className="text-xs text-slate-400">Aguardando há 3 min · Apt #apt-002</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-xs py-1.5 px-3">Admitir agora</button>
          <button className="btn-secondary text-xs py-1.5 px-3">Ver prontuário</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <Users size={15} /> Participantes ativos — Sala room-1
        </h3>
        <div className="space-y-2">
          {mockParticipants.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-surface-border last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: participantStatusColor[p.status] }} />
                <span className="text-sm text-slate-700">{p.displayName}</span>
                <span className="text-xs text-slate-400">({p.role})</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {p.reconnections > 0 && (
                  <span className="flex items-center gap-1">
                    <RefreshCw size={10} /> {p.reconnections}x
                  </span>
                )}
                <span>{p.joinedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditLog() {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
        <Shield size={15} style={{ color: '#152DFF' }} />
        Trilha de Auditoria — Sala room-1
      </h3>
      <div className="space-y-0 text-sm">
        {mockEvents.map((ev, i) => (
          <div key={ev.id} className={`flex items-start gap-3 py-2.5 ${i < mockEvents.length - 1 ? 'border-b border-surface-border' : ''}`}>
            <div className="flex-shrink-0 w-14 text-xs text-slate-400 pt-0.5">{ev.occurredAt}</div>
            <div className="flex-1">
              <p className="text-slate-700 font-medium">{eventLabels[ev.eventType] ?? ev.eventType}</p>
              <p className="text-xs text-slate-400">{ev.actorName} · {ev.actorRole}</p>
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

  const kpis = [
    { label: 'Em andamento', value: 1, icon: Video, bg: '#e6f8f7', fg: '#009d8f' },
    { label: 'Aguardando admissão', value: 1, icon: Clock, bg: '#fff0eb', fg: '#e56035' },
    { label: 'Agendadas hoje', value: 4, icon: CheckCircle2, bg: '#eef0ff', fg: '#152DFF' },
    { label: 'Encerradas hoje', value: 1, icon: Share2, bg: '#f1f5f9', fg: '#475569' },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Video }[] = [
    { id: 'salas',       label: 'Salas Virtuais',  icon: Video },
    { id: 'sala-espera', label: 'Sala de Espera',  icon: Users },
    { id: 'dispositivos',label: 'Dispositivos',    icon: MonitorCheck },
    { id: 'auditoria',   label: 'Auditoria',       icon: Shield },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Telemedicina — Sala Virtual
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Atendimentos remotos seguros vinculados à agenda e ao prontuário
        </p>
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
            <h2 className="text-base font-semibold text-slate-700">Salas hoje</h2>
            <button className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Video size={15} /> Nova Sala
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Dados fictícios para fins de demonstração. Ambiente isolado de produção.
          </p>
        </div>
      )}

      {tab === 'sala-espera' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Pacientes que entraram na sala antes de serem admitidos pelo profissional (RV-TELE-003).
          </p>
          <WaitingRoom />
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
          <AuditLog />
        </div>
      )}
    </div>
  );
}
