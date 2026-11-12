'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { Button, Input, FormField } from '@walletz/ui';
import { adminApi, apiErrorMessage } from '../../../../lib/admin-api';
import { withBasePath } from '../../../../lib/paths';

/** Senha inicial aleatória: 14 caracteres sem ambíguos (0/O, 1/l/I). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

interface Created { email: string; password: string }

/** Formulário do admin para criar a conta de um cliente (o cadastro público é fechado). */
export function NovoUsuario({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await adminApi.createUser({
        email: email.trim(),
        firstName: firstName.trim(),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        password,
      });
      setCreated({ email: email.trim().toLowerCase(), password });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}${withBasePath('/auth/login')}` : '';
  const credentialsText = created
    ? `Seu acesso ao Walletz Agent Studio:\n${loginUrl}\nE-mail: ${created.email}\nSenha: ${created.password}`
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* área de transferência indisponível: o texto está visível para copiar */ }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{created ? 'Usuário criado' : 'Novo usuário'}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {created ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Envie os dados abaixo para o cliente. No primeiro acesso ele cria a organização dele.
            A senha não aparece de novo depois que você fechar.
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 px-4 py-3 text-sm">{credentialsText}</pre>
          <div className="flex gap-2">
            <Button type="button" onClick={copy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar dados de acesso'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nome" required>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Maria" required maxLength={100} />
            </FormField>
            <FormField label="Sobrenome">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Silva" maxLength={100} />
            </FormField>
          </div>
          <FormField label="E-mail" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@empresa.com.br" required />
          </FormField>
          <FormField label="Senha inicial" required hint="Mínimo 8 caracteres. O cliente pode trocar depois.">
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={100} />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())} className="shrink-0 gap-1.5">
                <KeyRound className="h-4 w-4" />
                Gerar
              </Button>
            </div>
          </FormField>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Criar usuário</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  );
}
