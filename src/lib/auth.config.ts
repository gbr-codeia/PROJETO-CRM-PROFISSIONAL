import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no adapter, no bcrypt, no Prisma).
 * Shared by the middleware and the full server config in `auth.ts`.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.id = (user as { id: string }).id;
      return token;
    },
    session: ({ session, token }) => {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    /** Used by the middleware wrapper to gate the app routes. */
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isAuthPage = pathname === "/login";
      const isPublicApi =
        pathname.startsWith("/api/auth") || pathname === "/api/health";

      if (isPublicApi) return true;

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
};
