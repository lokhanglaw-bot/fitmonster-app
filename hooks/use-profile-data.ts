import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { getApiBaseUrl } from "@/constants/oauth";
import * as AuthModule from "@/lib/_core/auth";

export const PROFILE_DATA_KEY = "@fitmonster_profile_data";

export interface ProfileData {
  age: number;
  birthday?: string; // YYYY-MM-DD
  gender: "male" | "female";
  height: number;
  weight: number;
  bmr: number;
  dailyCalorieGoal: number;
  profileCompleted: boolean;
  updatedAt: string;
}

/**
 * Calculate age from a birthday string (YYYY-MM-DD).
 */
export function calculateAgeFromBirthday(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Hook to read the user's profile data (birthday, gender, height, weight, BMR, calorie goal)
 * from local AsyncStorage. Returns null if profile setup hasn't been completed.
 * Also provides a reload function to refresh data after edits.
 */
export function useProfileData(): { data: ProfileData | null; reload: () => void } {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileData(null);
      return;
    }

    const load = async () => {
      try {
        const key = `${PROFILE_DATA_KEY}_${user.openId || user.id}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw) as ProfileData;
          // Auto-recalculate age from birthday if available
          if (data.birthday) {
            data.age = calculateAgeFromBirthday(data.birthday);
          }
          setProfileData(data);
        } else {
          setProfileData(null);
        }
      } catch {
        setProfileData(null);
      }
    };

    load();
  }, [user, reloadKey]);

  // Sync profile to backend on first load (ensures DB has profile data for social features)
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (!profileData || !user || hasSyncedRef.current) return;
    if (!profileData.birthday || !profileData.gender || !profileData.height || !profileData.weight) return;
    hasSyncedRef.current = true;

    const syncProfile = async () => {
      try {
        const apiBase = getApiBaseUrl();
        if (!apiBase) return;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (Platform.OS !== "web") {
          const tok = await AuthModule.getSessionToken();
          if (tok) hdrs["Authorization"] = `Bearer ${tok}`;
        }
        // For local login users: add X-User-Id and X-Open-Id headers
        if (!hdrs["Authorization"]) {
          try {
            const localAuthRaw = await AsyncStorage.getItem("@fitmonster_local_auth");
            if (localAuthRaw) {
              const localUser = JSON.parse(localAuthRaw);
              if (localUser.id) hdrs["X-User-Id"] = String(localUser.id);
              if (localUser.openId) hdrs["X-Open-Id"] = localUser.openId;
            }
          } catch (_) { /* ignore */ }
        }
        await fetch(`${apiBase}/api/trpc/profile.setupProfile?batch=1`, {
          method: "POST",
          headers: hdrs,
          credentials: "include",
          body: JSON.stringify({
            "0": {
              json: {
                birthday: profileData.birthday,
                gender: profileData.gender,
                height: profileData.height,
                weight: profileData.weight,
              },
            },
          }),
        });
        console.log("[ProfileData] Profile synced to backend on load");
      } catch (err) {
        console.log("[ProfileData] Backend sync failed (non-critical):", err);
      }
    };
    // Delay to avoid blocking UI
    const timer = setTimeout(syncProfile, 3000);
    return () => clearTimeout(timer);
  }, [profileData, user]);

  return { data: profileData, reload };
}
