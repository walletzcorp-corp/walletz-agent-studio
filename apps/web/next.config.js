/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3010',
    API_URL: process.env.API_URL || 'http://localhost:3011',
  },
};

module.exports = nextConfig;
