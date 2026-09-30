'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

export default function NewUnitPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    organizationId: '',
    code: '',
    name: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cep: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/units', form, token);
      router.push('/units');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  return (
    <div className="max-w-xl">
      <h1 className="mb-6">Nova Unidade</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <div>
          <label className="label">ID da Organização *</label>
          <input name="organizationId" value={form.organizationId} onChange={handleChange} required className="input" placeholder="UUID da organização" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Código *</label>
            <input name="code" value={form.code} onChange={handleChange} required className="input" />
          </div>
          <div>
            <label className="label">Nome *</label>
            <input name="name" value={form.name} onChange={handleChange} required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input name="telefone" value={form.telefone} onChange={handleChange} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Logradouro</label>
          <input name="logradouro" value={form.logradouro} onChange={handleChange} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Número</label>
            <input name="numero" value={form.numero} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">Bairro</label>
            <input name="bairro" value={form.bairro} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">CEP</label>
            <input name="cep" value={form.cep} onChange={handleChange} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Cidade *</label>
            <input name="cidade" value={form.cidade} onChange={handleChange} required className="input" />
          </div>
          <div>
            <label className="label">UF *</label>
            <select name="uf" value={form.uf} onChange={handleChange} required className="input">
              <option value="">UF</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar Unidade'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
