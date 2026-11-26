'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@walletz/ui';

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Texto do botão que confirma (padrão: "Confirmar"). */
  action?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Confirmação dentro da própria página. Substitui window.confirm, que o navegador
 * pode silenciar ("impedir caixas de diálogo adicionais") e fazer o botão parecer quebrado.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  useEffect(() => { if (options) confirmButton.current?.focus(); }, [options]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onClose={() => close(false)}>
        <DialogContent role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
          <DialogHeader>
            <DialogTitle id="confirm-dialog-title">{options?.title}</DialogTitle>
            {options?.description && <DialogDescription id="confirm-dialog-description">{options.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>Cancelar</Button>
            <Button ref={confirmButton} variant="destructive" onClick={() => close(true)}>{options?.action ?? 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm precisa estar dentro de ConfirmProvider');
  return confirm;
}
