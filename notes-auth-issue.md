# Auth Issue Analysis

## Root Cause
The `localLogin` mutation returns `{ success, id, openId, name }` but does NOT:
1. Set a session cookie
2. Return a JWT token

The client stores `{ id, openId, name, email }` in AsyncStorage under `@fitmonster_local_auth`.

When making tRPC requests, the client (trpc.ts) tries:
1. `Auth.getSessionToken()` → Bearer token (will be null for local login users)
2. Falls back to `X-User-Id` / `X-Open-Id` headers from AsyncStorage

But the server's `authenticateRequest` in sdk.ts ONLY checks:
1. Bearer token from Authorization header
2. Session cookie

It does NOT check `X-User-Id` or `X-Open-Id` headers.

## Impact
ALL protectedProcedure calls fail for local login users (email/password, Google, Apple native).
This affects: Food Scanner, Chat, Nearby Trainers, Friend Requests, etc.

## Same issue for Google and Apple login
Looking at `googleLogin` and `appleLogin` in auth-context.tsx:
- They also store user in AsyncStorage with LOCAL_AUTH_KEY
- They also don't get a JWT session token from the server
- So they have the same problem

## Solution Options
1. Make server `authenticateRequest` also check X-User-Id/X-Open-Id headers
2. Have localLogin/googleLogin/appleLogin server mutations return a JWT token and store it via Auth.setSessionToken()

Option 2 is more secure. The server should sign a JWT with the user's openId and return it.
The client should store it via Auth.setSessionToken() (SecureStore on native).
Then all subsequent tRPC calls will have a valid Bearer token.
