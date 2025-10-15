/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Allow build to proceed even with missing environment variables
  env: {
    // Provide fallback values for build time
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
    RESEND_API_KEY: process.env.RESEND_API_KEY || "placeholder-resend-key",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "placeholder-gemini-key",
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXT_PUBLIC_BASE_URL || "https://placeholder.com",
  },
};

module.exports = nextConfig;
