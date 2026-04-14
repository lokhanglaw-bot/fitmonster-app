// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "space.manus.fitmonster.app.t20260212212854";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "FitMonster",
  appSlug: "fitmonster-app",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663333995640/aOksVaXRoQGVxopd.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
  // Google Sign In Client IDs — read from env vars (never hardcode in source)
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? "",
  googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? "",
  googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID ?? "",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.3.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    usesAppleSignIn: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // HealthKit usage descriptions
      NSHealthShareUsageDescription: "FitMonster reads your step count and workout data to power your Monster's growth. Your data is stored locally and never shared with third parties.",
      NSHealthUpdateUsageDescription: "FitMonster may save workout data to Apple Health.",
      // Location usage descriptions for nearby users feature
      NSLocationWhenInUseUsageDescription: "FitMonster uses your location to find nearby trainers for battles and friend matching.",

      NSCameraUsageDescription: "FitMonster uses your camera to take photos of your meals for AI-powered nutritional analysis. For example, you can photograph your lunch to automatically calculate calories, protein, carbs, and fat content.",
      NSPhotoLibraryUsageDescription: "FitMonster accesses your photo library so you can select meal photos for AI-powered nutritional analysis.",
      // Motion & Fitness Activity usage description
      NSMotionUsageDescription: "FitMonster uses your device's motion and fitness activity data to count your daily steps. For example, when you tap 'Sync Steps' on the Workout screen, the app reads today's step count from your device's pedometer to calculate EXP points that help your virtual monster grow stronger.",
    },
    entitlements: {
      "com.apple.developer.applesignin": ["Default"],
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.access": [],
    },
  },
  android: {
    versionCode: 20,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      },
    },
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: true,
    package: env.androidPackage,
    permissions: [
      "POST_NOTIFICATIONS",
      // Health Connect permissions
      "android.permission.ACTIVITY_RECOGNITION",
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_EXERCISE",
      "android.permission.health.READ_TOTAL_CALORIES_BURNED",
      "android.permission.health.READ_DISTANCE",
      // Location permissions for nearby users feature
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",

    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    [
      "expo-audio",
      {
        microphonePermission: "FitMonster uses your microphone to record voice messages in chat conversations with your friends. For example, you can press and hold the microphone button to send a voice note instead of typing.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: false,
        supportsPictureInPicture: false,
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a", "x86_64"],
          minSdkVersion: 26,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
      },
    ],
    [
      "expo-notifications",
      {
        enableBackgroundRemoteNotifications: true,
      },
    ],
    ["@react-native-google-signin/google-signin", {
      iosUrlScheme: "com.googleusercontent.apps.525433155057-m3b87hddvrqmoe5jjlun01hb5kdula6d",
    }],
    // expo-location config for foreground-only location
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "FitMonster uses your location to find nearby trainers on the map for battles and friend matching. For example, when you open the Nearby Trainers screen, the app shows trainers within your selected radius.",
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    // HealthKit (iOS) — react-native-health config plugin
    ["react-native-health", {
      healthSharePermission: "FitMonster reads your step count and workout data to power your Monster's growth.",
      healthUpdatePermission: "FitMonster may save workout data to Apple Health.",
    }],
    // Health Connect (Android) — react-native-health-connect config plugin
    // Note: expo-health-connect may not be needed if react-native-health-connect handles its own config
  ],
  extra: {
    eas: {
      projectId: "d2d082ac-2355-4462-b14b-591a913d941b",
    },
    googleWebClientId: env.googleWebClientId,
    googleIosClientId: env.googleIosClientId,
    googleAndroidClientId: env.googleAndroidClientId,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
