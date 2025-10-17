/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_BASE: process.env.VITE_API_BASE || 'http://localhost:8000/api/v1'
  },
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material']
  }
}

export default nextConfig
