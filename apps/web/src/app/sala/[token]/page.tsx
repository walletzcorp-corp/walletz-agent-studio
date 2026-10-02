'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Video, Clock, CheckCircle2, AlertTriangle, Loader2, PhoneOff } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface RoomInfo {
  roomId: string;
  organizationId: string;
  roomStatus: string;
  scheduledAt: string;
  patientName: string;
  participantStatus: string;
  role: string;
}

type Phase = 'loading' | 'waiting' | 'joining' | 'in-room' | 'ended' | 'error';

export default function SalaPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/tel-join/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Erro ${res.status}`);
        }
        return res.json() as Promise<RoomInfo>;
      })
      .then((info) => {
        setRoomInfo(info);
        if (info.roomStatus === 'ENCERRADA' || info.roomStatus === 'CANCELADA') {
          setPhase('ended');
        } else {
          setPhase('waiting');
        }
      })
      .catch((err) => {
        setErrorMsg(err.message ?? 'Link inválido ou expirado.');
        setPhase('error');
      });
  }, [token]);

  async function handleJoin() {
    setPhase('joining');
    try {
      const res = await fetch(`${API_BASE}/tel-join/${token}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Erro ${res.status}`);
      }
      setPhase('in-room');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Não foi possível entrar na sala.');
      setPhase('error');
    }
  }

  const scheduledStr = roomInfo?.scheduledAt
    ? new Date(roomInfo.scheduledAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#152DFF]/5 to-[#00B7A8]/5 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#152DFF] to-[#00B7A8] flex items-center justify-center">
            <Video className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Walletz Med</h1>
            <p className="text-xs text-slate-500">Sala Virtual de Atendimento</p>
          </div>
        </div>

        {/* Security notice — RV-TELE-009: sem conteúdo clínico */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 mb-6">
          Este link é individual e temporário. Não compartilhe com terceiros.
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#152DFF]" />
            <p className="text-sm">Verificando link de acesso…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <p className="text-base font-semibold text-slate-800">Link inválido</p>
            <p className="text-sm text-slate-500 text-center">{errorMsg}</p>
            <p className="text-xs text-slate-400 text-center mt-2">
              Solicite um novo link ao profissional de saúde responsável.
            </p>
          </div>
        )}

        {phase === 'ended' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <PhoneOff className="h-10 w-10 text-slate-400" />
            <p className="text-base font-semibold text-slate-800">Sala encerrada</p>
            <p className="text-sm text-slate-500 text-center">
              Esta consulta já foi encerrada ou cancelada.
            </p>
          </div>
        )}

        {(phase === 'waiting' || phase === 'joining') && roomInfo && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Olá, <span className="font-semibold text-slate-900">{roomInfo.patientName}</span>
              </p>
              {scheduledStr && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <Clock size={12} />
                  <span>Consulta agendada para {scheduledStr}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              Aguarde o profissional iniciar a consulta. Quando estiver pronto, clique em
              <strong> Entrar na Sala</strong>.
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className={`h-2 w-2 rounded-full ${
                roomInfo.roomStatus === 'EM_ANDAMENTO' ? 'bg-green-500 animate-pulse' : 'bg-amber-400'
              }`} />
              {roomInfo.roomStatus === 'EM_ANDAMENTO'
                ? 'Consulta em andamento — você pode entrar agora'
                : 'Aguardando início da consulta'}
            </div>

            <button
              onClick={handleJoin}
              disabled={phase === 'joining'}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#152DFF] to-[#00B7A8] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {phase === 'joining' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  <Video size={16} />
                  Entrar na Sala
                </>
              )}
            </button>
          </div>
        )}

        {phase === 'in-room' && roomInfo && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-base font-semibold text-slate-800">Você está na sala</p>
              <p className="text-sm text-slate-500 text-center">
                Sua entrada foi registrada. O profissional irá admiti-lo em instantes.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 text-center">
              Mantenha esta página aberta. A integração com a plataforma de vídeo
              estará disponível em breve nesta tela.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
