'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { Button, Input, FormField, cn } from '@walletz/ui';
import { adminApi, apiErrorMessage, type CreatedCustomer, type CustomerType } from '../../../../lib/admin-api';
import { withBasePath } from '../../../../lib/paths';
import { isValidCnpj, isValidCpf, maskCnpj, maskCpf, maskPhone, onlyDigits } from '../../../../lib/tax-id';

/** Senha inicial aleatória: 14 caracteres sem ambíguos (0/O, 1/l/I). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

const TYPES: Array<{ id: CustomerType; label: string }> = [
  { id: 'pf', label: 'Pessoa física' },
  { id: 'pj', label: 'Pessoa jurídica' },
];

/** Cadastro de cliente pelo admin: cria a organização e o login do responsável de uma vez. */
export function NovoCliente({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<CustomerType>('pf');
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<(CreatedCustomer & { password: string }) | null>(null);
  const [copied, setCopied] = useState(false);

  const isPf = type === 'pf';
  const docLabel = isPf ? 'CPF' : 'CNPJ';
  const docDigits = onlyDigits(taxId);
  const docComplete = docDigits.length === (isPf ? 11 : 14);
  const docValid = isPf ? isValidCpf(taxId) : isValidCnpj(taxId);
  const docError = docComplete && !docValid ? `${docLabel} inválido` : undefined;

  const changeType = (t: CustomerType) => {
    setType(t);
    setTaxId('');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!docValid) {
      setError(`Confira o ${docLabel}.`);
      return;
    }
    setSaving(true);
    try {
      const { data } = await adminApi.createCustomer({
        type,
        name: name.trim(),
        taxId: docDigits,
        email: email.trim(),
        password,
        ...(onlyDigits(phone) ? { phone: onlyDigits(phone) } : {}),
        ...(!isPf ? { contactName: contactName.trim() } : {}),
      });
      setCreated({ ...data, password });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}${withBasePath('/auth/login')}` : '';
  const credentialsText = created
    ? created.ownerUserCreated
      ? `Seu acesso ao Walletz Agent Studio:\n${loginUrl}\nE-mail: ${created.ownerEmail}\nSenha: ${created.password}`
      : `Sua conta no Walletz Agent Studio foi vinculada a "${name.trim()}".\n${loginUrl}\nEntre com o e-mail ${created.ownerEmail} e a senha que você já usa.`
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
        <h2 className="font-semibold">{created ? 'Cliente cadastrado' : 'Novo cliente'}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {created ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {created.ownerUserCreated
              ? 'Organização e login criados. Envie os dados abaixo para o cliente; a senha não aparece de novo depois que você fechar.'
              : 'Este e-mail já tinha conta: ele foi vinculado como dono da nova organização e a senha dele não mudou.'}
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 px-4 py-3 text-sm">{credentialsText}</pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar dados de acesso'}
            </Button>
            <Link href={`/admin/clientes/${created.tenantId}`}>
              <Button type="button" variant="outline">Abrir cliente</Button>
            </Link>
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div role="radiogroup" aria-label="Tipo de cliente" className="inline-flex rounded-lg border border-border p-0.5">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={type === t.id}
                onClick={() => changeType(t.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  type === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={isPf ? 'Nome completo' : 'Nome da empresa'} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isPf ? 'Maria da Silva' : 'Clínica Sorriso Ltda.'}
                required
                minLength={2}
                maxLength={120}
              />
            </FormField>
            <FormField label={docLabel} required error={docError}>
              <Input
                value={taxId}
                onChange={(e) => setTaxId(isPf ? maskCpf(e.target.value) : maskCnpj(e.target.value))}
                placeholder={isPf ? '000.000.000-00' : '00.000.000/0000-00'}
                inputMode="numeric"
                required
              />
            </FormField>
          </div>

          {!isPf && (
            <FormField label="Nome do responsável" required hint="Quem vai entrar no sistema pela empresa.">
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="João Souza" required minLength={2} maxLength={120} />
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="E-mail de acesso" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" required />
            </FormField>
            <FormField label="Telefone / WhatsApp">
              <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="tel" />
            </FormField>
          </div>

          <FormField label="Senha inicial" required hint="Mínimo 8 caracteres. Se o e-mail já tiver conta, a senha atual é mantida.">
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={100} />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())} className="shrink-0 gap-1.5">
                <KeyRound className="h-4 w-4" />
                Gerar
              </Button>
            </div>
          </FormField>

          <p className="text-xs text-muted-foreground">O cliente começa em teste grátis de 14 dias.</p>

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Cadastrar cliente</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  );
}
