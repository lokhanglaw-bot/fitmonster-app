import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/use-auth";

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

  return { data: profileData, reload };
}
