import type { Metadata } from 'next';
import { WalletzLogo } from '../../components/walletz-logo';

export const metadata: Metadata = {
  title: { absolute: 'Walletz Agent Studio' },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Background neural glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6D4AFF 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <WalletzLogo variant="full" size="lg" />
          <p
            className="text-xs tracking-[0.2em] uppercase font-medium"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Crie. Ensine. Conecte. Automatize.
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
