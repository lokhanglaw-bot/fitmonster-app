# Caring System Implementation Notes

## Status
- All 15 unit tests pass
- TypeScript: 0 errors
- Dev server: running
- Screenshot shows login page (expected - user needs to sign in to see home screen with caring panel)

## Files Created/Modified
### New files:
- `server/caring-db.ts` - Core caring system DB functions (decay, feed, exercise, battle modifiers, status)
- `server/caring-prompt.ts` - LLM prompt for nutrition advice in monster character
- `components/monster-caring-panel.tsx` - UI component with status bars, dialogue, advice button
- `lib/caring-context.tsx` - Client-side React context for caring state management
- `tests/caring-system.test.ts` - 15 unit tests for pure functions

### Modified files:
- `drizzle/schema.ts` - Added monsterCaring table
- `server/routers.ts` - Added caring router with getStatus, feed, exercise, getAdvice endpoints
- `lib/i18n-context.tsx` - Added caring-related translation keys (en + zh)
- `app/_layout.tsx` - Added CaringProvider wrapper
- `app/(tabs)/index.tsx` - Integrated MonsterCaringPanel below monster card, auto-feed on food log
- `app/(tabs)/camera.tsx` - Auto-feed on camera food analysis save
- `app/workout-tracking.tsx` - Auto-exercise on workout completion

## Caring System Features
1. **Hunger System** (Phase 1): Fullness decays ~3.5/hr, feeding from food logs, HP effects
2. **Nutrition Advice** (Phase 2): LLM-powered monster dialogue based on 7-day nutrition analysis
3. **Vitality System** (Phase 3): Energy from exercise, battle stat modifiers, peak state buff
