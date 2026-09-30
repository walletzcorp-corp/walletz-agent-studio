'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

export default function NewOrganizationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/organizations', form, token);
      router.push('/organizations');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1>Nova Organização</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados da organização</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="label">Razão Social *</label>
          <input name="razaoSocial" value={form.razaoSocial} onChange={handleChange} required className="input" />
        </div>
        <div>
          <label className="label">Nome Fantasia *</label>
          <input name="nomeFantasia" value={form.nomeFantasia} onChange={handleChange} required className="input" />
        </div>
        <div>
          <label className="label">CNPJ *</label>
          <input name="cnpj" value={form.cnpj} onChange={handleChange} required placeholder="00.000.000/0000-00" className="input" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="telefone" value={form.telefone} onChange={handleChange} className="input" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar Organização'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
