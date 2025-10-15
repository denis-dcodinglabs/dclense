/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Remove env section to allow real environment variables to be used at runtime
  // The build will work because we moved client initialization inside functions
};

module.exports = nextConfig;
