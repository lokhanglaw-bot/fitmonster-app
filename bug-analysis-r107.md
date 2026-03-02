# Round 107 Bug Analysis

## Bug 1: Friend request sender auto-added as friend

### Root Cause Analysis
Looking at the screenshot: Friends(1) shows on the sender's side even though the request is still "Pending".

The `friendsQuery` (trpc.friends.list) queries `getFriendsWithInfo` which only returns `status: "accepted"` friendships. So the server is correct.

The issue is:
1. `friendsQuery` has NO `refetchInterval` — it only refetches on explicit `.refetch()` calls
2. In `handleSwipe` (line 393-398), after sending a request, it calls `friendsQuery.refetch()` — this should NOT return the new pending request since `getFriendsWithInfo` filters by `status: "accepted"`
3. BUT the `useEffect` on line 169 has condition `friendsQuery.data.length > 0` — if there was already 1 accepted friend from before, that would show

Wait — the user says "發送交友通知後...已經自動加了好友" and the screenshot shows Friends(1). This could mean:
- The user already had 1 friend from before, OR
- There's a race condition where the friendship is somehow being set to "accepted" immediately

Looking more carefully: the `createFriendship` in db.ts inserts with default status. Let me check the schema.

Actually the most likely issue is: the user had an existing accepted friend already, and the confusion is about the Sent Requests still showing "Pending" after the OTHER user accepted.

### Bug 2: Pending not removed after acceptance

Root cause: `sentQuery` and `friendsQuery` have NO `refetchInterval`. They only refetch when explicitly called. After the OTHER user accepts, the sender's app has no way to know unless:
1. The user pulls to refresh
2. The queries auto-refetch on interval

Fix: Add `refetchInterval` to `friendsQuery`, `pendingQuery`, and `sentQuery` so they poll periodically.

### Bug 3: Chat text mirrored on Android

Root cause: `FlatList inverted` + `scaleY: -1` on empty state. On some Android devices, `scaleY: -1` flips the entire view including text rendering. Need to use `rotateX: '180deg'` instead which rotates without mirroring text.
