'use client';

import { useState } from 'react';

const ROOM_STATUS_COLORS: Record<string, string> = {
  LIVRE:         'bg-emerald-100 text-emerald-800',
  RESERVADA:     'bg-blue-100 text-blue-800',
  PREPARADA:     'bg-cyan-100 text-cyan-800',
  OCUPADA:       'bg-orange-100 text-orange-800',
  HIGIENIZACAO:  'bg-yellow-100 text-yellow-800',
  BLOQUEADA:     'bg-red-100 text-red-800',
  INATIVA:       'bg-gray-100 text-gray-500',
};

const MOCK_ROOMS = [
  { id: 'r1', name: 'Consultório 01', code: 'C01', type: 'CONSULTORIO', status: 'LIVRE',      capacity: 1, upcomingBookings: 0 },
  { id: 'r2', name: 'Sala de Infusão A', code: 'SI-A', type: 'INFUSAO',     status: 'OCUPADA',    capacity: 6, upcomingBookings: 3 },
  { id: 'r3', name: 'Centro Cirúrgico 1', code: 'CC1', type: 'CIRURGIA',    status: 'PREPARADA',  capacity: 1, upcomingBookings: 1 },
  { id: 'r4', name: 'Sala de Procedimento B', code: 'SP-B', type: 'PROCEDIMENTO', status: 'HIGIENIZACAO', capacity: 1, upcomingBookings: 0 },
  { id: 'r5', name: 'Triagem 01', code: 'TR01', type: 'TRIAGEM',    status: 'LIVRE',      capacity: 2, upcomingBookings: 0 },
  { id: 'r6', name: 'Sala Bloqueada (Manutenção)', code: 'MAN', type: 'OUTRO',       status: 'BLOQUEADA',  capacity: 1, upcomingBookings: 0 },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  LIVRE:        ['RESERVADA', 'BLOQUEADA', 'INATIVA'],
  RESERVADA:    ['PREPARADA', 'LIVRE'],
  PREPARADA:    ['OCUPADA', 'LIVRE'],
  OCUPADA:      ['HIGIENIZACAO'],
  HIGIENIZACAO: ['LIVRE', 'BLOQUEADA'],
  BLOQUEADA:    ['LIVRE', 'INATIVA'],
  INATIVA:      ['LIVRE'],
};

export default function SalasPage() {
  const [rooms, setRooms] = useState(MOCK_ROOMS);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const selectedRoom = rooms.find(r => r.id === selected);

  function applyTransition(roomId: string, toStatus: string) {
    if (!reason.trim()) { alert('Informe o motivo da mudança de estado.'); return; }
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: toStatus } : r));
    setReason('');
    setSelected(null);
  }

  const filtered = filterStatus ? rooms.filter(r => r.status === filterStatus) : rooms;

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salas e Fluxo Físico</h1>
        <p className="text-sm text-gray-500 mt-1">
          Módulo 13 (SAL) — Gerenciamento de salas, reservas e fluxo de pacientes
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries({
          LIVRE: 'Livres',
          OCUPADA: 'Ocupadas',
          BLOQUEADA: 'Bloqueadas',
          HIGIENIZACAO: 'Em Higienização',
        }).map(([status, label]) => (
          <div key={status} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-bold mt-1">
              {rooms.filter(r => r.status === status).length}
            </div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
        >
          <option value="">Todos</option>
          {Object.keys(ROOM_STATUS_COLORS).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(room => (
          <div
            key={room.id}
            className={`bg-white rounded-xl shadow-sm border p-4 space-y-2 cursor-pointer transition hover:shadow-md ${selected === room.id ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-gray-100'}`}
            onClick={() => setSelected(selected === room.id ? null : room.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-gray-900">{room.name}</div>
                <div className="text-xs text-gray-400">{room.code} · {room.type}</div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROOM_STATUS_COLORS[room.status]}`}>
                {room.status}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Capacidade: {room.capacity}</span>
              <span>Reservas próximas: {room.upcomingBookings}</span>
            </div>

            {selected === room.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-3" onClick={e => e.stopPropagation()}>
                <div className="text-sm font-medium text-gray-700">Mudar estado:</div>
                <div className="flex flex-wrap gap-2">
                  {(VALID_TRANSITIONS[room.status] ?? []).map(next => (
                    <button
                      key={next}
                      onClick={() => applyTransition(room.id, next)}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${ROOM_STATUS_COLORS[next] ?? 'bg-gray-100 text-gray-700'} hover:opacity-80`}
                    >
                      → {next}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Motivo da mudança (obrigatório)"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
                {room.status === 'BLOQUEADA' && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Sala bloqueada — nenhuma reserva pode ser criada até liberação.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
