import { useAuthContext } from "@/lib/auth-context";

/**
 * Hook to access shared authentication state.
 * All components using this hook share the same auth state via AuthProvider context.
 *
 * The `autoFetch` option is kept for API compatibility but is no longer needed
 * since the AuthProvider handles initial fetch.
 */
type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(_options?: UseAuthOptions) {
  return useAuthContext();
}
