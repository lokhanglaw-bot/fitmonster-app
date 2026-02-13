import { startOAuthLogin as startOAuth } from "@/constants/oauth";
import { Platform } from "react-native";

/**
 * Start OAuth login flow.
 * On web, this redirects to the OAuth portal.
 * On native, this opens the system browser and the callback will reopen the app.
 */
export async function startOAuthLogin(): Promise<void> {
  await startOAuth();
  // On web, the redirect happens automatically
  // On native, the OAuth callback will reopen the app via deep link
}

/**
 * Check if user needs to authenticate.
 * Returns true if on auth screen or needs login.
 */
export function shouldShowAuth(pathname: string, isAuthenticated: boolean): boolean {
  // Don't show auth on OAuth callback route
  if (pathname.includes("/oauth/callback")) {
    return false;
  }
  
  // Show auth if not authenticated and not already on auth screen
  return !isAuthenticated && !pathname.includes("/auth");
}
