/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'pdf-parse', 'nodemailer'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // xlsx uses node builtins — stub them in the browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, stream: false, crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
