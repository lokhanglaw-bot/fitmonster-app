# Debug Notes - Round 65

## Database State (2026-02-23)

### Users (5 rows):
- id=1: lok hang Law (google)
- id=30029: Ken Law (apple) ← user's main account
- id=90001: chenghiuching denise (google)
- id=300001: Stephen NGAI (google)
- id=1020101: null name (apple)

### Monsters: EMPTY → all name lookups return null → fallback to "Bodybuilder"
### Profiles: EMPTY → no trainerName, gender data
### Friendships: 1 row (30029↔90001, accepted)
### PushTokens: 22 duplicates for userId 90001, 2 for 30029

## Fixes Applied:
1. ✅ Monster sync in activity-context.tsx (triggers on app open)
2. ✅ WS fallback auth using getUserById (checks users table)
3. ✅ sendRequest validates target user exists
4. TODO: Fix push token deduplication
5. TODO: Verify WS fallback works end-to-end on native
