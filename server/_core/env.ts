function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: requireEnv("JWT_SECRET"),
  databaseUrl: requireEnv("DATABASE_URL"),
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // FIX 22: Google OAuth Client IDs from env vars (no hardcoded secrets)
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? "",
  googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? "",
  googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID ?? "",
  // Fix 1: Email service for password reset tokens
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "noreply@fitmonster.app",
};
