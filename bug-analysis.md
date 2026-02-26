# Bug Analysis - Fullness Decay

## Problem
Fullness drops from 100 to 70 in ~37 minutes (should be ~2 points in that time).

## Root Cause
Looking at the code flow:
1. `status` route calls `upsertMonsterCaring(userId, {})` first - this creates a record with defaults (fullness=70) if none exists, or does `db.update().set({})` with empty data if exists
2. Then calls `applyFullnessDecay()` which reads the record and applies time-based decay

The issue is that `upsertMonsterCaring(userId, {})` with empty `{}` when the record already exists calls `db.update(monsterCaring).set({}).where(...)`. With Drizzle ORM, calling `.set({})` with an empty object may trigger the `onUpdateNow()` on the `updatedAt` column but shouldn't change other values.

However, the REAL issue is likely:
- The `lastDecayAt` timestamp may be stored in UTC in the DB
- But `new Date(caring.lastDecayAt)` on the server may interpret it differently
- OR the DB returns a Date object that's already correct, but the timezone offset causes `hoursElapsed` to be much larger than expected

## Actual Fix Needed
1. Add a minimum decay cap - don't let fullness drop more than expected per interval
2. Add logging to debug the actual hoursElapsed value
3. Consider: the `lastDecayAt` is set to `defaultNow()` at creation time, but if the user doesn't access the app for a while, the first access will apply ALL accumulated decay at once

## Key Insight
If a user creates an account and doesn't check status for 12 hours, the first status check would apply: 12 * 3.5 = 42 points of decay! Starting from 70, that would drop to 28.

The fix should:
1. Cap the maximum decay per application to prevent large jumps
2. When creating a new caring record, set lastDecayAt to NOW
3. Ensure the upsert doesn't accidentally reset values
