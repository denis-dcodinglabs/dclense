import { NextResponse } from "next/server";

export async function GET() {
  try {
    // List of environment variables your app uses
    const envVars = {
      // Supabase variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // API Keys
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,

      // Base URL
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,

      // Node environment
      NODE_ENV: process.env.NODE_ENV,

      // CapRover specific
      CAPROVER_APP_NAME: process.env.CAPROVER_APP_NAME,
      CAPROVER_APP_VERSION: process.env.CAPROVER_APP_VERSION,

      // All environment variables (for debugging)
      ALL_ENV_VARS: process.env,
    };

    // Log to console for CapRover logs
    console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
    console.log(
      "NEXT_PUBLIC_SUPABASE_URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET"
    );
    console.log(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET"
    );
    console.log(
      "SUPABASE_SERVICE_ROLE_KEY:",
      process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET"
    );
    console.log(
      "RESEND_API_KEY:",
      process.env.RESEND_API_KEY ? "SET" : "NOT SET"
    );
    console.log(
      "GEMINI_API_KEY:",
      process.env.GEMINI_API_KEY ? "SET" : "NOT SET"
    );
    console.log(
      "NEXT_PUBLIC_BASE_URL:",
      process.env.NEXT_PUBLIC_BASE_URL || "NOT SET"
    );
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log(
      "CAPROVER_APP_NAME:",
      process.env.CAPROVER_APP_NAME || "NOT SET"
    );
    console.log(
      "CAPROVER_APP_VERSION:",
      process.env.CAPROVER_APP_VERSION || "NOT SET"
    );
    console.log("=====================================");

    return NextResponse.json({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
