import type { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'walletz-web',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
      issuer: `${process.env.KEYCLOAK_URL ?? 'http://localhost:8090'}/realms/${process.env.KEYCLOAK_REALM ?? 'walletz-med'}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
