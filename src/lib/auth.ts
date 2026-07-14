export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development'
}

export const DEV_USER = {
  email: 'test@gmail.com',
  name: 'Test User',
}

/**
 * Returns the current session user.
 * In development, always returns the dev user.
 * In production, this would validate a JWT or session cookie.
 */
export function getSession(): { email: string; name: string } | null {
  if (isDevMode()) return DEV_USER
  // TODO: implement production auth (JWT validation)
  return null
}
