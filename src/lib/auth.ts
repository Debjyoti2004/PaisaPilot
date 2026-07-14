import { NextAuthOptions, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
        // Seed default data for brand-new users (no-op if already exists)
        const { seedUserDefaults } = await import('@/lib/seed-user')
        await seedUserDefaults(user.id).catch(() => {})
      }
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const getAuthSession = () => getServerSession(authOptions)

// Use in every API route — returns userId or throws 401
export async function requireUserId(): Promise<string> {
  const session = await getAuthSession()
  const id = (session?.user as { id?: string } | undefined)?.id
  if (!id) throw new Error('UNAUTHORIZED')
  return id
}
