# EAS Build Capability Sync Findings

## Key Discovery
From Expo docs: "If a capability is enabled for your app remotely, but not present in the native entitlements file, then running `eas build` will automatically disable it."

This means EAS Build DISABLES Sign In with Apple because it doesn't find the entitlement in the local config.

## BUT - we DO have it in app.config.ts:
- `ios.usesAppleSignIn: true` — this should add the entitlement
- `ios.entitlements["com.apple.developer.applesignin"]` is NOT explicitly set

## The Fix
The entitlement string for Sign In with Apple is: `com.apple.developer.applesignin`
The `usesAppleSignIn: true` in app.config.ts SHOULD automatically add this entitlement.

But maybe it's not being picked up properly. We should ALSO explicitly add:
```
ios.entitlements: {
  "com.apple.developer.applesignin": ["Default"],
}
```

## Alternative: Disable capability sync
`EXPO_NO_CAPABILITY_SYNC=1 eas build` — but this means ALL capabilities won't sync

## Supported capability table shows:
Sign In with Apple | `com.apple.developer.applesignin` — IS supported by EAS Build

## Conclusion
The issue is that `usesAppleSignIn: true` adds the plugin but may not be adding the entitlement properly.
We need to explicitly add `"com.apple.developer.applesignin": ["Default"]` to ios.entitlements in app.config.ts.
