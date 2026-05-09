import { useEffect, useRef } from "react";
import { Alert, Linking, Platform } from "react-native";
import Constants from "expo-constants";

// App Store ID - update this after your app is published on App Store
const APP_STORE_ID = "6741440938"; // FitMonster App Store ID
const BUNDLE_ID = "space.manus.fitmonster.app.t20260212212854";

/**
 * Compare two semantic version strings (e.g. "1.4.5" vs "1.5.0")
 * Returns true if remoteVersion is newer than localVersion
 */
function isNewerVersion(localVersion: string, remoteVersion: string): boolean {
  const local = localVersion.split(".").map(Number);
  const remote = remoteVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(local.length, remote.length); i++) {
    const l = local[i] || 0;
    const r = remote[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Fetch the latest version from App Store using iTunes Lookup API
 */
async function getAppStoreVersion(): Promise<string | null> {
  try {
    // Use bundle ID lookup (works before and after app is live)
    const response = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=hk`
    );
    const data = await response.json();
    if (data.resultCount > 0 && data.results[0]?.version) {
      return data.results[0].version;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Open the App Store page for this app
 */
function openAppStore() {
  if (Platform.OS === "ios") {
    Linking.openURL(`https://apps.apple.com/app/id${APP_STORE_ID}`);
  } else if (Platform.OS === "android") {
    Linking.openURL(`https://play.google.com/store/apps/details?id=${BUNDLE_ID}`);
  }
}

/**
 * Hook that checks for app updates on mount.
 * Shows an alert if a newer version is available on the App Store.
 * 
 * @param language - "en" or "zh" for localized messages
 */
export function useVersionCheck(language: string = "zh") {
  const hasChecked = useRef(false);
  const isEn = language === "en";

  useEffect(() => {
    // Only check on native platforms, not web
    if (Platform.OS === "web") return;
    // Only check once per app session
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkVersion = async () => {
      const currentVersion = Constants.expoConfig?.version || "1.0.0";
      const storeVersion = await getAppStoreVersion();

      if (storeVersion && isNewerVersion(currentVersion, storeVersion)) {
        Alert.alert(
          isEn ? "Update Available" : "有新版本可用",
          isEn
            ? `A new version (v${storeVersion}) is available. You are currently on v${currentVersion}. Update now for the latest features and fixes.`
            : `新版本 v${storeVersion} 已發佈！你目前使用的是 v${currentVersion}。立即更新以獲取最新功能和修復。`,
          [
            {
              text: isEn ? "Later" : "稍後再說",
              style: "cancel",
            },
            {
              text: isEn ? "Update Now" : "立即更新",
              onPress: openAppStore,
            },
          ]
        );
      }
    };

    // Delay the check slightly to not block app startup
    const timer = setTimeout(checkVersion, 2000);
    return () => clearTimeout(timer);
  }, [isEn]);
}
