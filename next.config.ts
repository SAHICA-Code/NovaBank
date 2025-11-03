/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false // ← lo dejamos en false, queremos mantenerlo
  }
};

module.exports = nextConfig;
