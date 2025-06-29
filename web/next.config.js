/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    NEXT_PUBLIC_APP_NAME: 'Food Traceability',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/producer',
        permanent: false,
      },
    ]
  },
  images: {
    domains: ['localhost'],
  },
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig