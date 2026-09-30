import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from './auth';

export async function getToken(): Promise<string | undefined> {
  // Primeiro tenta NextAuth (produção / Keycloak)
  const session = await getServerSession(authOptions);
  if (session) return (session as any).accessToken as string;

  // Dev mode: lê o cookie setado pelo botão "Entrar como Dev Admin"
  const cookieStore = cookies();
  const devToken = cookieStore.get('walletz_dev_token')?.value;
  return devToken;
}
