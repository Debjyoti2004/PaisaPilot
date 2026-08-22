import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: [
    '/((?!login|api/auth|api/health|_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.ico|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.gif|.*\\.woff2?|.*\\.ttf|.*\\.otf).*)',
  ],
}
