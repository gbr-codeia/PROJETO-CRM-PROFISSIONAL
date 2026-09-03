import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge middleware: only reads the JWT to gate routes (see authConfig.callbacks.authorized).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Guard page routes only. `/api/*` handles its own auth in `withAuth`
     * (returns 401 JSON instead of redirecting).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
