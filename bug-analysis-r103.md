# Round 103 Bug Analysis

## Bug 1: Profile update popup every app launch
**Root cause**: AuthGate checks `@fitmonster_profile_completed_{userId}` in AsyncStorage. 
This key is only set locally. When the user:
- Reinstalls the app
- Clears app data
- Logs in on a new device
The key is missing, so AuthGate thinks profile is not completed and redirects to profile-setup.

**Fix**: In AuthGate's checkProfile, also check the server DB for profile.profileCompleted.
If server says profileCompleted=true, cache it locally and skip profile-setup.
Also: after profile-setup saves, it already syncs to server via setupProfile mutation which sets profileCompleted=true.

## Bug 2: Delete account not auto-logging out
**Root cause**: The delete handler in edit-profile.tsx does:
1. fetch deleteAccount API
2. AsyncStorage.clear()
3. AuthModule.removeSessionToken() + clearUserInfo()
4. router.replace("/auth")

But it does NOT call the AuthContext's `logout()` function, so `user` state in AuthContext remains set.
AuthGate sees isAuthenticated=true and may redirect back to home.

**Fix**: After successful delete, call `logout()` from AuthContext. This sets user=null.
Then router.replace("/auth").

## Bug 3: Apple ID login crash
**Root cause**: The OAuth flow uses WebBrowser.openAuthSessionAsync. If it fails or the 
callback URL handling has issues, the app may hang. Need better error handling and 
timeout protection.

**Fix**: Add try-catch with timeout, and handle all error cases gracefully.

## Bug 4: Deleted account shows "update password" instead of "account not found"
**Root cause**: After account deletion, user's data is removed from DB. But when the user
tries to login again:
1. localLogin calls verifyLocalUser(email, password)
2. verifyLocalUser calls getUserByEmail(email) - returns null (user deleted)
3. Returns null -> throws INVALID_CREDENTIALS

BUT: The AuthContext's fetchUser calls syncLocalUserToDb which calls syncLocalUser tRPC route.
syncLocalUser uses upsertUser which does INSERT ... ON DUPLICATE KEY UPDATE.
Since the user was deleted, the openId no longer exists, so it creates a NEW user record
with the same openId but NO password hash/salt.

When user then tries to login:
1. verifyLocalUser finds the newly created user
2. User has no passwordHash/passwordSalt
3. Returns { status: "needs_password" }
4. Frontend shows "update password" modal

The real fix: After deleting account, also clear LOCAL_AUTH_KEY from AsyncStorage.
Currently the delete handler calls AsyncStorage.clear() which should clear it.
But the problem is that on next app launch, if there's still a cached session,
syncLocalUserToDb recreates the user.

**Fix**: 
1. Delete handler must call logout() to properly clear all state
2. syncLocalUser should NOT create users that don't exist - change from upsert to update-only
   OR: Add a check in localLogin - if user has no password and was just created (no profile), 
   show "account not found" instead of "needs password"

## Bug 5: Android missing delete account button
**Root cause**: Need to check if the edit-profile.tsx renders the delete section on Android.
Possibly a platform-specific rendering issue or the page is not scrollable enough to see it.
