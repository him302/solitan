import type { CurrentUser } from '@soliton/api-contract';

/**
 * Admin auth client foundation (Next.js).
 *
 * Security approach:
 *  - The short-lived ACCESS token is held in memory only (module scope) — never in
 *    localStorage/sessionStorage, so it is not readable by injected scripts and does
 *    not persist on disk.
 *  - The long-lived REFRESH token must be stored as an httpOnly, Secure, SameSite
 *    cookie set by a Next.js Route Handler (server side). It is never exposed to
 *    browser JavaScript. (That server route is implemented in a later phase.)
 *  - No long-lived secrets live in browser code.
 */
let accessToken: string | null = null;
let currentUser: CurrentUser | null = null;

export const authClient = {
  getAccessToken(): string | null {
    return accessToken;
  },
  getUser(): CurrentUser | null {
    return currentUser;
  },
  setSession(token: string, user: CurrentUser): void {
    accessToken = token;
    currentUser = user;
  },
  clear(): void {
    accessToken = null;
    currentUser = null;
  },
};
