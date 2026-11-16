'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const toastVariants = cva(
  'pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
        success:
          'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onClose?: () => void;
}

function Toast({ className, variant, title, description, onClose, ...props }: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }), className)} {...props}>
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {description && <p className="mt-0.5 text-sm opacity-90">{description}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Fechar"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Toaster: renders toasts in a fixed portal area
interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastProps['variant'];
}

type ToasterContextType = {
  toast: (opts: Omit<ToastData, 'id'>) => void;
};

const ToasterContext = React.createContext<ToasterContextType>({ toast: () => {} });

function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((opts: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToasterContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            title={t.title}
            description={t.description}
            variant={t.variant}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToasterContext.Provider>
  );
}

function useToast() {
  return React.useContext(ToasterContext);
}

export { Toast, ToasterProvider, useToast };
