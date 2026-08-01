import { NextAuthOptions, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),

    // Email + password sign-in
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user?.password) return null
        const ok = await compare(credentials.password, user.password)
        if (!ok) return null
        return { id: user.id, name: user.name, email: user.email, image: user.image }
      },
    }),

    // Dev-only instant login — only works in development
    CredentialsProvider({
      id: 'dev-login',
      name: 'Dev Login',
      credentials: { token: { label: 'Dev Token', type: 'text' } },
      async authorize(credentials) {
        if (process.env.NODE_ENV !== 'development') return null
        if (credentials?.token !== 'dev-bypass-2024') return null
        const devEmail = process.env.DEV_USER_EMAIL || 'dev@paisapilot.local'
        let user = await prisma.user.findUnique({ where: { email: devEmail } })
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: devEmail,
              name: 'Dev User',
              emailVerified: new Date(),
            },
          })
        }
        return { id: user.id, name: user.name, email: user.email, image: null }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string
      return session
    },
    async signIn({ user }) {
      if (user?.id) {
        const { seedUserDefaults } = await import('@/lib/seed-user')
        await seedUserDefaults(user.id).catch(() => {})
      }
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const getAuthSession = () => getServerSession(authOptions)

export async function requireUserId(): Promise<string> {
  const session = await getAuthSession()
  const id = (session?.user as { id?: string } | undefined)?.id
  if (!id) throw new Error('UNAUTHORIZED')
  return id
}
