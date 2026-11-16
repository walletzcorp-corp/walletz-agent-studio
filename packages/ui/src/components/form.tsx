'use client';

import * as React from 'react';
import { cn } from '../utils';
import { Label } from './label';

// Structurally compatible with react-hook-form's FieldError, without depending on it.
interface FieldError {
  message?: string;
}

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: FieldError | string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      {!errorMessage && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export { FormField, FormSection };
