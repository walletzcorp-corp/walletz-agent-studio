'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { api } from '../../../lib/api';
import { Button, Card, CardContent } from '@walletz/ui';
import { Users, Upload, Search, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  origin: string | null;
  tags: string[];
  isBlocked: boolean;
  createdAt: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ContatosPage() {
  const { tenantId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<Contact[]>(`/tenants/${tenantId}/contacts`);
      setContacts(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantId]);

  const filtered = contacts.filter((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ').toLowerCase();
    return (
      !search ||
      name.includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0]!.split(',').map((h) => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
      setCsvRows(rows);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!tenantId || !fileRef.current?.files?.[0]) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', fileRef.current.files[0]);
    try {
      const { data } = await api.post<ImportResult>(
        `/tenants/${tenantId}/contacts/import/csv`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setImportResult(data);
      setShowPreview(false);
      setCsvRows([]);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro na importação';
      setImportResult({ imported: 0, skipped: 0, errors: [msg] });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!tenantId || !confirm('Remover este contato?')) return;
    try {
      await api.delete(`/tenants/${tenantId}/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {
      /* silent */
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Contatos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.length} contatos importados
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div
          className={`rounded-lg border p-4 text-sm flex items-start gap-3 ${importResult.errors.length > 0 ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-green-200 bg-green-50 text-green-800'}`}
        >
          {importResult.errors.length > 0 ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {importResult.errors.length > 0 ? 'Erro na importação' : 'Importação concluída'}
            </p>
            <p>
              {importResult.imported} importados · {importResult.skipped} ignorados (duplicatas)
            </p>
            {importResult.errors.map((e, i) => (
              <p key={i} className="text-xs mt-1">
                {e}
              </p>
            ))}
          </div>
          <button onClick={() => setImportResult(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CSV Preview */}
      {showPreview && csvRows.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Preview — {csvRows.length} linhas detectadas</p>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setCsvRows([]);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-x-auto rounded border border-border">
              <table className="text-xs w-full">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(csvRows[0] ?? {}).map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvRows.length > 5 && (
              <p className="text-xs text-muted-foreground">… e mais {csvRows.length - 5} linhas</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreview(false);
                  setCsvRows([]);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => void handleImport()} disabled={importing}>
                {importing ? 'Importando…' : `Importar ${csvRows.length} contatos`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Buscar por nome ou empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Contacts list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-semibold">Nenhum contato encontrado</p>
            <p className="text-sm text-muted-foreground">
              Importe uma planilha CSV com seus leads e clientes
            </p>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Empresa
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Origem
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {(c.firstName ?? c.id.slice(0, 1)).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Sem nome'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {c.company ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {c.origin ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(c.tags as string[]).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void handleDelete(c.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
