'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@walletz/ui';
import { signupWhatsappUrl } from '../../../lib/contact';

/**
 * O cadastro é fechado: as contas são criadas pela equipe Walletz.
 * Quem quer usar o produto fala com a equipe pelo WhatsApp.
 */
export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quer usar o Walletz Agent Studio?</CardTitle>
        <CardDescription>
          A criação de contas é feita pela nossa equipe. Fale com a gente pelo WhatsApp e
          liberamos o seu acesso.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-col gap-4">
        <a
          href={signupWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          Falar com a equipe no WhatsApp
        </a>
        <p className="text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
