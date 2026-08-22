/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'pdf-parse', 'nodemailer', 'xlsx', 'nspell'],
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, stream: false, crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
