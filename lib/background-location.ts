import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

const LOCATION_TASK_NAME = "LOCATION_UPDATE";
const UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// Define the background task at module level (global scope)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[BackgroundLocation] Task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latest = locations[locations.length - 1];
      console.log(
        `[BackgroundLocation] Received location: (${latest.coords.latitude}, ${latest.coords.longitude})`
      );
      // Send to server via fetch (can't use tRPC in background task)
      await sendLocationToServer(latest.coords.latitude, latest.coords.longitude).catch((err) =>
        console.warn("[BackgroundLocation] Failed to send location:", err)
      );
    }
  }
});

async function sendLocationToServer(latitude: number, longitude: number) {
  // FIX 12: Use absolute URL + auth header for background tasks
  // FIX 3: Use JWT session token from SecureStore (not openId which is NOT a JWT)
  try {
    const SecureStore = await import("expo-secure-store");
    const sessionToken = await SecureStore.getItemAsync("app_session_token");
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }
    const response = await fetch(`${baseUrl}/api/trpc/location.update`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        json: { latitude, longitude, isSharing: true },
      }),
    });
    if (response.ok) {
      console.log("[BackgroundLocation] Location sent to server successfully");
    }
  } catch (err) {
    console.warn("[BackgroundLocation] Server request failed:", err);
  }
}

export async function startBackgroundLocationUpdates(): Promise<boolean> {
  if (Platform.OS === "web") {
    console.log("[BackgroundLocation] Not available on web");
    return false;
  }

  try {
    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      console.log("[BackgroundLocation] Task already registered");
      return true;
    }

    // Request background permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      console.warn("[BackgroundLocation] Foreground permission not granted");
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      console.warn("[BackgroundLocation] Background permission not granted");
      return false;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: UPDATE_INTERVAL_MS,
      deferredUpdatesInterval: UPDATE_INTERVAL_MS,
      distanceInterval: 100, // minimum 100m movement
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "FitMonster",
        notificationBody: "Sharing your location with nearby trainers",
        notificationColor: "#22C55E",
      },
    });

    console.log("[BackgroundLocation] Background location updates started (15 min interval)");
    return true;
  } catch (err) {
    console.error("[BackgroundLocation] Failed to start:", err);
    return false;
  }
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("[BackgroundLocation] Background location updates stopped");
    }
  } catch (err) {
    console.warn("[BackgroundLocation] Failed to stop:", err);
  }
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}
