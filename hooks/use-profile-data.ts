import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/use-auth";

const PROFILE_DATA_KEY = "@fitmonster_profile_data";

export interface ProfileData {
  age: number;
  gender: "male" | "female";
  height: number;
  weight: number;
  bmr: number;
  dailyCalorieGoal: number;
  profileCompleted: boolean;
  updatedAt: string;
}

/**
 * Hook to read the user's profile data (age, gender, height, weight, BMR, calorie goal)
 * from local AsyncStorage. Returns null if profile setup hasn't been completed.
 */
export function useProfileData(): ProfileData | null {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

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
          setProfileData(data);
        } else {
          setProfileData(null);
        }
      } catch {
        setProfileData(null);
      }
    };

    load();
  }, [user]);

  return profileData;
}
