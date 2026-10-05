import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Walletz Agent Studio</h1>
          <p className="mt-2 text-sm text-gray-600">
            Entre na sua conta para continuar
          </p>
        </div>
        {/* Sprint 1: LoginForm component implementation */}
        <div className="text-center text-sm text-gray-500">
          Formulário de login — Sprint 1
        </div>
      </div>
    </div>
  );
}
