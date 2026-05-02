/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Permite que server actions trabalhem bem com cookies do Supabase.
    serverActions: {
      allowedOrigins: ['localhost:3000', 'sobra.app', 'sobra.com.br'],
    },
  },
}

module.exports = nextConfig
